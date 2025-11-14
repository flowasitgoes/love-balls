import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LevelsService } from '../services/levels.service';
import { ProgressService } from '../services/progress.service';
import { Level } from '../models/level.model';
import { Engine, World, Bodies, Body, Events, Composite, Constraint } from 'matter-js';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
  standalone: false,
})
export class GamePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  level: Level | undefined;
  levelName: string = '';
  levelComplete: boolean = false;
  hasNextLevel: boolean = false;

  private engine!: Engine;
  private world!: World;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  
  private blueBall!: Body;
  private orangeBall!: Body;
  private lineSegments: Body[] = [];
  private lineConstraints: Constraint[] = [];
  
  private isDrawing: boolean = false;
  private drawingPoints: Point[] = [];
  private animationFrameId: number | null = null;
  
  private readonly MAX_SEGMENTS = 50;
  private readonly MIN_SEGMENT_LENGTH = 5;
  private readonly SEGMENT_THICKNESS = 8;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private levelsService: LevelsService,
    private progressService: ProgressService
  ) {}

  ngOnInit() {
    const levelId = parseInt(this.route.snapshot.paramMap.get('id') || '1', 10);
    this.level = this.levelsService.getLevelById(levelId);
    
    if (!this.level) {
      this.router.navigate(['/home']);
      return;
    }

    this.levelName = this.level.name;
    
    // Check if there's a next level
    const allLevels = this.levelsService.getLevels();
    this.hasNextLevel = levelId < allLevels.length;
  }

  ngAfterViewInit() {
    if (!this.level) return;

    this.canvas = this.canvasRef.nativeElement;
    const context = this.canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get 2d context');
      return;
    }
    this.ctx = context;
    
    // Set canvas size (must be done after getting context)
    this.setupCanvas();
    
    // Initialize physics engine
    this.initPhysics();
    
    // Setup drawing
    this.setupDrawing();
    
    // Setup collision detection
    this.setupCollisionDetection();
    
    // Start render loop
    this.startRenderLoop();
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.engine) {
      Engine.clear(this.engine);
    }
  }

  private setupCanvas(): void {
    // Use window dimensions, accounting for header
    const headerHeight = 56; // Approximate Ionic header height
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight - headerHeight;
    
    // Set display size for high DPI screens
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = displayWidth + 'px';
    this.canvas.style.height = displayHeight + 'px';
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private initPhysics(): void {
    if (!this.level) return;

    // Create engine
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.world.gravity.y = 0.8;

    // Get logical canvas dimensions (not scaled by DPR)
    const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Scale to match level dimensions
    const scaleX = logicalWidth / this.level.width;
    const scaleY = logicalHeight / this.level.height;
    const scale = Math.min(scaleX, scaleY);

    // Create static bodies (ground and platforms)
    this.level.staticBodies.forEach(staticBody => {
      const body = Bodies.rectangle(
        staticBody.x * scale,
        staticBody.y * scale,
        staticBody.width * scale,
        staticBody.height * scale,
        { isStatic: true, render: { fillStyle: '#666666' } }
      );
      World.add(this.world, body);
    });

    // Create blue ball
    this.blueBall = Bodies.circle(
      this.level.blueBall.x * scale,
      this.level.blueBall.y * scale,
      this.level.blueBall.radius * scale,
      { 
        render: { fillStyle: '#4285f4' },
        frictionAir: 0.01,
        friction: 0.1,
        restitution: 0.3,
        density: 0.001
        // Don't set inertia - let Matter.js calculate it for proper rotation
      }
    );
    World.add(this.world, this.blueBall);

    // Create orange ball
    this.orangeBall = Bodies.circle(
      this.level.orangeBall.x * scale,
      this.level.orangeBall.y * scale,
      this.level.orangeBall.radius * scale,
      { 
        render: { fillStyle: '#ff9800' },
        frictionAir: 0.01,
        friction: 0.1,
        restitution: 0.3,
        density: 0.001
        // Don't set inertia - let Matter.js calculate it for proper rotation
      }
    );
    World.add(this.world, this.orangeBall);

    // Store scale for later use
    (this as any).scale = scale;
  }

  private setupDrawing(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.levelComplete) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.isDrawing = true;
    this.drawingPoints = [{ x, y }];
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDrawing || this.levelComplete) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
    const distance = Math.sqrt(
      Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
    );
    
    // Only add point if it's far enough from the last point
    if (distance > 3) {
      this.drawingPoints.push({ x, y });
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.createLineSegments();
    this.drawingPoints = [];
  }

  private createLineSegments(): void {
    if (this.drawingPoints.length < 2) return;
    if (this.lineSegments.length >= this.MAX_SEGMENTS) return;

    const scale = (this as any).scale || 1;
    
    // Filter out points that are too close together
    const filteredPoints: Point[] = [this.drawingPoints[0]];
    for (let i = 1; i < this.drawingPoints.length; i++) {
      const lastPoint = filteredPoints[filteredPoints.length - 1];
      const currentPoint = this.drawingPoints[i];
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.x, 2) + 
        Math.pow(currentPoint.y - lastPoint.y, 2)
      );
      
      // Only keep points that are at least MIN_SEGMENT_LENGTH apart
      if (distance >= this.MIN_SEGMENT_LENGTH) {
        filteredPoints.push(currentPoint);
      }
    }
    
    if (filteredPoints.length < 2) return;
    
    // Create segments and connect them with constraints for continuous line
    const newSegments: Body[] = [];
    const newConstraints: Constraint[] = [];
    
    for (let i = 0; i < filteredPoints.length - 1; i++) {
      if (this.lineSegments.length + newSegments.length >= this.MAX_SEGMENTS) break;
      
      const p1 = filteredPoints[i];
      const p2 = filteredPoints[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length < this.MIN_SEGMENT_LENGTH) continue;
      
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const angle = Math.atan2(dy, dx);
      
      const segment = Bodies.rectangle(
        midX,
        midY,
        length,
        this.SEGMENT_THICKNESS,
        {
          angle: angle,
          render: { fillStyle: '#333333' },
          frictionAir: 0.01,
          friction: 0.3,
          restitution: 0.2,
          density: 0.001
        }
      );
      
      World.add(this.world, segment);
      newSegments.push(segment);
      
      // Connect this segment to the previous one if it exists
      if (newSegments.length > 1) {
        const prevSegment = newSegments[newSegments.length - 2];
        const prevP1 = filteredPoints[newSegments.length - 2];
        const prevP2 = filteredPoints[newSegments.length - 1];
        const prevLength = Math.sqrt(
          Math.pow(prevP2.x - prevP1.x, 2) + 
          Math.pow(prevP2.y - prevP1.y, 2)
        );
        const prevAngle = Math.atan2(prevP2.y - prevP1.y, prevP2.x - prevP1.x);
        
        // Calculate connection points in local coordinates
        // Right end of previous segment (in its local space)
        const prevEndX = prevLength / 2;
        const prevEndY = 0;
        
        // Left end of current segment (in its local space)
        const currStartX = -length / 2;
        const currStartY = 0;
        
        const constraint = Constraint.create({
          bodyA: prevSegment,
          bodyB: segment,
          pointA: { x: prevEndX, y: prevEndY },
          pointB: { x: currStartX, y: currStartY },
          stiffness: 1,
          length: 0
        });
        World.add(this.world, constraint);
        newConstraints.push(constraint);
      }
    }
    
    // Add all new segments and constraints to our tracking arrays
    this.lineSegments.push(...newSegments);
    this.lineConstraints.push(...newConstraints);
  }

  private setupCollisionDetection(): void {
    Events.on(this.engine, 'collisionStart', (event: any) => {
      const pairs = event.pairs;
      
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        
        if ((bodyA === this.blueBall && bodyB === this.orangeBall) ||
            (bodyA === this.orangeBall && bodyB === this.blueBall)) {
          this.onLevelComplete();
        }
      }
    });
  }

  private onLevelComplete(): void {
    if (this.levelComplete) return;
    
    this.levelComplete = true;
    
    if (this.level) {
      this.progressService.completeLevel(this.level.id);
    }
  }

  private startRenderLoop(): void {
    // Store logical dimensions for clearing
    const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Run physics engine with fixed timestep
    const renderLoop = () => {
      // Update physics (60 FPS)
      Engine.update(this.engine, 1000 / 60);
      
      // Clear canvas (use logical dimensions since we scaled the context)
      this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      
      // Draw all bodies
      this.drawBodies();
      
      // Draw current drawing line
      if (this.isDrawing && this.drawingPoints.length > 1) {
        this.drawCurrentLine();
      }
      
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
  }

  private drawBodies(): void {
    const allBodies = Composite.allBodies(this.world);
    
    // Enable smooth rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    allBodies.forEach((body: any) => {
      // Draw static bodies (ground/platforms)
      if (body.isStatic) {
        this.drawStaticBody(body);
        return;
      }
      
      this.ctx.save();
      this.ctx.translate(body.position.x, body.position.y);
      this.ctx.rotate(body.angle);
      
      // Check if body is one of our known circles (blue or orange ball)
      const isCircle = body === this.blueBall || body === this.orangeBall;
      
      if (isCircle) {
        // Draw circle - calculate radius from vertices
        const vertices = body.vertices;
        let radius = 0;
        if (vertices && vertices.length > 0) {
          // Calculate radius from first vertex distance
          radius = Math.sqrt(
            Math.pow(vertices[0].x - body.position.x, 2) + 
            Math.pow(vertices[0].y - body.position.y, 2)
          );
        } else {
          // Fallback: try circleRadius property
          radius = (body as any).circleRadius || 20;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = (body as any).render?.fillStyle || '#333';
        this.ctx.fill();
      } else {
        // Draw polygon (rectangle or other shapes) with smooth edges
        const vertices = body.vertices;
        if (vertices && vertices.length > 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
          for (let i = 1; i < vertices.length; i++) {
            this.ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
          }
          this.ctx.closePath();
          this.ctx.fillStyle = (body as any).render?.fillStyle || '#333';
          this.ctx.fill();
        }
      }
      
      this.ctx.restore();
    });
  }
  
  private drawStaticBody(body: any): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.translate(body.position.x, body.position.y);
    this.ctx.rotate(body.angle);
    
    const vertices = body.vertices;
    if (vertices && vertices.length > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = (body as any).render?.fillStyle || '#666666';
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawCurrentLine(): void {
    if (this.drawingPoints.length < 2) return;
    
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = this.SEGMENT_THICKNESS;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
    for (let i = 1; i < this.drawingPoints.length; i++) {
      this.ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
    }
    this.ctx.stroke();
  }

  restart(): void {
    // Remove all line segments
    this.lineSegments.forEach(segment => {
      World.remove(this.world, segment);
    });
    this.lineSegments = [];
    
    // Reset balls to initial positions
    if (this.level) {
      const scale = (this as any).scale || 1;
      Body.setPosition(this.blueBall, {
        x: this.level.blueBall.x * scale,
        y: this.level.blueBall.y * scale
      });
      Body.setVelocity(this.blueBall, { x: 0, y: 0 });
      Body.setAngle(this.blueBall, 0);
      
      Body.setPosition(this.orangeBall, {
        x: this.level.orangeBall.x * scale,
        y: this.level.orangeBall.y * scale
      });
      Body.setVelocity(this.orangeBall, { x: 0, y: 0 });
      Body.setAngle(this.orangeBall, 0);
    }
    
    this.levelComplete = false;
  }

  closeOverlay(): void {
    // Overlay can be closed by clicking outside
  }

  nextLevel(): void {
    if (this.level) {
      const nextLevelId = this.level.id + 1;
      this.router.navigate(['/game', nextLevelId]);
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
