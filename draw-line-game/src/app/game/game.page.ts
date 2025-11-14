import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LevelsService } from '../services/levels.service';
import { ProgressService } from '../services/progress.service';
import { Level } from '../models/level.model';
import { Engine, World, Bodies, Body, Events, Composite } from 'matter-js';
import { IonContent } from '@ionic/angular';

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
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  level: Level | undefined;
  levelName: string = '';
  levelComplete: boolean = false;
  hasNextLevel: boolean = false;
  showVictoryAnimation: boolean = false;

  private engine!: Engine;
  private world!: World;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  
  private blueBall!: Body;
  private orangeBall!: Body;
  private lineSegments: Body[] = [];
  
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

    console.log('=== Game Page Initialization ===');
    console.log('Level loaded:', {
      id: this.level.id,
      name: this.level.name
    });

    this.canvas = this.canvasRef.nativeElement;
    const context = this.canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get 2d context');
      return;
    }
    this.ctx = context;
    
    console.log('Canvas element obtained:', {
      canvasExists: !!this.canvas,
      contextExists: !!this.ctx,
      initialWidth: this.canvas.width,
      initialHeight: this.canvas.height
    });
    
    // Wait for content to be ready and layout to complete
    // Use multiple delays to ensure ion-content is fully initialized
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('Starting canvas setup...');
          this.setupCanvas();
          
          // Initialize physics engine
          this.initPhysics();
          
          // Setup drawing
          this.setupDrawing();
          
          // Setup collision detection
          this.setupCollisionDetection();
          
          // Start render loop
          this.startRenderLoop();
          
          // Setup ResizeObserver to watch for container size changes
          this.setupResizeObserver();
          
          console.log('=== Game Page Initialization Complete ===');
        });
      });
    }, 200);
  }
  
  private setupResizeObserver(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize
      clearTimeout((this as any).resizeTimeout);
      (this as any).resizeTimeout = setTimeout(() => {
        this.setupCanvas();
        // Reinitialize physics if needed
        if (this.level && this.engine) {
          // Don't reinitialize physics on every resize, just update canvas
          // this.initPhysics();
        }
      }, 100);
    });
    
    resizeObserver.observe(container);
    (this as any).resizeObserver = resizeObserver;
  }
  
  @HostListener('window:resize', ['$event'])
  onResize() {
    if (this.canvas && this.ctx && this.level) {
      // Debounce resize to avoid too many updates
      clearTimeout((this as any).resizeTimeout);
      (this as any).resizeTimeout = setTimeout(() => {
        this.setupCanvas();
        // Reinitialize physics with new dimensions
        this.initPhysics();
      }, 100);
    }
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.engine) {
      Engine.clear(this.engine);
    }
    if ((this as any).resizeObserver) {
      (this as any).resizeObserver.disconnect();
    }
    if ((this as any).resizeTimeout) {
      clearTimeout((this as any).resizeTimeout);
    }
  }

  private setupCanvas(): void {
    // Use viewport dimensions directly, accounting for header
    // This is more reliable than getting container dimensions which may not be calculated yet
    
    console.log('=== Canvas Setup Start ===');
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get header height (ion-header with toolbar)
    const header = document.querySelector('ion-header');
    const headerRect = header ? header.getBoundingClientRect() : null;
    const headerHeight = headerRect ? headerRect.height : 0;
    
    // Get ion-content element
    const ionContent = document.querySelector('ion-content');
    const ionContentRect = ionContent ? ionContent.getBoundingClientRect() : null;
    
    // Get canvas container
    const container = this.canvas ? this.canvas.parentElement : null;
    const containerRect = container ? container.getBoundingClientRect() : null;
    
    console.log('Viewport info:', {
      innerWidth: viewportWidth,
      innerHeight: viewportHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      screenWidth: screen.width,
      screenHeight: screen.height,
      devicePixelRatio: window.devicePixelRatio || 1
    });
    
    console.log('Header info:', {
      exists: !!header,
      height: headerHeight,
      rect: headerRect ? {
        width: headerRect.width,
        height: headerRect.height,
        top: headerRect.top,
        left: headerRect.left,
        bottom: headerRect.bottom
      } : 'null'
    });
    
    console.log('ion-content info:', {
      exists: !!ionContent,
      rect: ionContentRect ? {
        width: ionContentRect.width,
        height: ionContentRect.height,
        top: ionContentRect.top,
        left: ionContentRect.left,
        bottom: ionContentRect.bottom
      } : 'null',
      computedStyle: ionContent ? {
        width: getComputedStyle(ionContent).width,
        height: getComputedStyle(ionContent).height,
        display: getComputedStyle(ionContent).display
      } : 'null'
    });
    
    console.log('Container info:', {
      exists: !!container,
      rect: containerRect ? {
        width: containerRect.width,
        height: containerRect.height,
        top: containerRect.top,
        left: containerRect.left,
        bottom: containerRect.bottom
      } : 'null',
      computedStyle: container ? {
        width: getComputedStyle(container).width,
        height: getComputedStyle(container).height,
        display: getComputedStyle(container).display
      } : 'null'
    });
    
    // Calculate available height (viewport minus header)
    // Since header might be translucent, we can use slightly more height
    // Reduce header height deduction by a small amount to maximize canvas space
    const headerDeduction = Math.max(headerHeight - 4, 0); // Reduce by 4px to get more height
    const availableHeight = viewportHeight - headerDeduction;
    
    // Use viewport width and calculated available height
    let displayWidth = viewportWidth;
    let displayHeight = availableHeight;
    
    // If calculated height is too small, use viewport height directly (header might be translucent)
    if (displayHeight < 400) {
      displayHeight = viewportHeight;
      console.warn('Height too small, using full viewport height:', displayHeight);
    }
    
    console.log('Canvas setup calculation:', {
      viewport: `${viewportWidth}x${viewportHeight}`,
      headerHeight: headerHeight,
      availableHeight: availableHeight,
      finalWidth: displayWidth,
      finalHeight: displayHeight,
      heightRatio: (displayHeight / viewportHeight * 100).toFixed(1) + '%'
    });
    
    this.updateCanvasSize(displayWidth, displayHeight);
    console.log('=== Canvas Setup End ===');
  }
  
  private updateCanvasSize(displayWidth: number, displayHeight: number): void {
    // Use provided dimensions, or fallback to viewport if invalid
    const finalWidth = displayWidth > 0 ? displayWidth : window.innerWidth;
    const finalHeight = displayHeight > 0 ? displayHeight : window.innerHeight;
    
    // Set display size for high DPI screens
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas display size (CSS pixels)
    this.canvas.style.width = finalWidth + 'px';
    this.canvas.style.height = finalHeight + 'px';
    
    // Set canvas internal size (actual pixels)
    this.canvas.width = finalWidth * dpr;
    this.canvas.height = finalHeight * dpr;
    
    // Reset transform to prevent cumulative scaling
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Apply DPR scale
    this.ctx.scale(dpr, dpr);
    
    // Get container info
    const container = this.canvas.parentElement;
    const containerRect = container ? container.getBoundingClientRect() : null;
    
    console.log('=== Canvas Size Updated ===');
    console.log('Input dimensions:', {
      displayWidth: displayWidth,
      displayHeight: displayHeight,
      fallbackUsed: displayWidth === 0 || displayHeight === 0
    });
    console.log('Final dimensions:', {
      cssWidth: finalWidth,
      cssHeight: finalHeight,
      internalWidth: this.canvas.width,
      internalHeight: this.canvas.height,
      dpr: dpr
    });
    console.log('Canvas element:', {
      styleWidth: this.canvas.style.width,
      styleHeight: this.canvas.style.height,
      width: this.canvas.width,
      height: this.canvas.height,
      clientWidth: this.canvas.clientWidth,
      clientHeight: this.canvas.clientHeight,
      offsetWidth: this.canvas.offsetWidth,
      offsetHeight: this.canvas.offsetHeight
    });
    console.log('Container info:', {
      containerRect: containerRect ? {
        width: containerRect.width,
        height: containerRect.height,
        top: containerRect.top,
        left: containerRect.left
      } : 'null',
      containerStyle: container ? {
        width: getComputedStyle(container).width,
        height: getComputedStyle(container).height
      } : 'null'
    });
    console.log('========================');
  }

  private initPhysics(): void {
    if (!this.level) return;

    console.log('=== Physics Engine Initialization ===');
    console.log('Level data:', {
      id: this.level.id,
      name: this.level.name,
      levelWidth: this.level.width,
      levelHeight: this.level.height,
      blueBall: {
        x: this.level.blueBall.x,
        y: this.level.blueBall.y,
        radius: this.level.blueBall.radius
      },
      orangeBall: {
        x: this.level.orangeBall.x,
        y: this.level.orangeBall.y,
        radius: this.level.orangeBall.radius
      },
      staticBodies: this.level.staticBodies.map((body, index) => ({
        index: index,
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height
      }))
    });

    // Create engine
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.engine.world.gravity.y = 0.8;

    // Get logical canvas dimensions (not scaled by DPR)
    const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);
    
    console.log('Canvas logical dimensions:', {
      logicalWidth: logicalWidth,
      logicalHeight: logicalHeight,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      dpr: window.devicePixelRatio || 1
    });
    
    // Scale to match level dimensions
    // Use scaleX to fit width, then check if height is sufficient
    const scaleX = logicalWidth / this.level.width;
    const scaleY = logicalHeight / this.level.height;
    
    // Use scaleX to ensure width fits, height can be larger (content will be centered)
    // This prevents height from being compressed
    const scale = scaleX;
    
    // Calculate actual used height with this scale
    const scaledLevelHeight = this.level.height * scale;
    const heightOffset = scaledLevelHeight < logicalHeight ? (logicalHeight - scaledLevelHeight) / 2 : 0;

    console.log('Scaling calculation:', {
      scaleX: scaleX,
      scaleY: scaleY,
      finalScale: scale,
      levelWidth: this.level.width,
      levelHeight: this.level.height,
      scaledLevelWidth: this.level.width * scale,
      scaledLevelHeight: scaledLevelHeight,
      logicalWidth: logicalWidth,
      logicalHeight: logicalHeight,
      heightOffset: heightOffset,
      willFit: scaledLevelHeight <= logicalHeight
    });
    
    // Store height offset for rendering
    (this as any).heightOffset = heightOffset;

    // Create static bodies (ground and platforms)
    const staticBodiesInfo: any[] = [];
    this.level.staticBodies.forEach((staticBody, index) => {
      const scaledX = staticBody.x * scale;
      const scaledY = staticBody.y * scale + heightOffset; // Apply height offset for centering
      const scaledWidth = staticBody.width * scale;
      const scaledHeight = staticBody.height * scale;
      
      const body = Bodies.rectangle(
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        { isStatic: true, render: { fillStyle: '#666666' } }
      );
      World.add(this.world, body);
      
      staticBodiesInfo.push({
        index: index,
        original: {
          x: staticBody.x,
          y: staticBody.y,
          width: staticBody.width,
          height: staticBody.height
        },
        scaled: {
          x: scaledX,
          y: scaledY,
          width: scaledWidth,
          height: scaledHeight
        },
        bodyId: body.id
      });
    });

    console.log('Static bodies created:', staticBodiesInfo);

    // Create blue ball - optimized physics properties based on reference
    const blueBallOriginalX = this.level.blueBall.x;
    const blueBallOriginalY = this.level.blueBall.y;
    const blueBallOriginalRadius = this.level.blueBall.radius;
    const blueBallScaledX = blueBallOriginalX * scale;
    const blueBallScaledY = blueBallOriginalY * scale + heightOffset; // Apply height offset for centering
    const blueBallScaledRadius = blueBallOriginalRadius * scale;
    
    this.blueBall = Bodies.circle(
      blueBallScaledX,
      blueBallScaledY,
      blueBallScaledRadius,
      { 
        render: { fillStyle: '#4285f4' },
        frictionAir: 0.01,
        friction: 0.8,
        restitution: 0.5,
        density: 1.0
      }
    );
    World.add(this.world, this.blueBall);

    console.log('Blue ball created:', {
      original: {
        x: blueBallOriginalX,
        y: blueBallOriginalY,
        radius: blueBallOriginalRadius
      },
      scaled: {
        x: blueBallScaledX,
        y: blueBallScaledY,
        radius: blueBallScaledRadius
      },
      bodyId: this.blueBall.id,
      position: {
        x: this.blueBall.position.x,
        y: this.blueBall.position.y
      },
      circleRadius: (this.blueBall as any).circleRadius
    });

    // Create orange ball - optimized physics properties based on reference
    const orangeBallOriginalX = this.level.orangeBall.x;
    const orangeBallOriginalY = this.level.orangeBall.y;
    const orangeBallOriginalRadius = this.level.orangeBall.radius;
    const orangeBallScaledX = orangeBallOriginalX * scale;
    const orangeBallScaledY = orangeBallOriginalY * scale + heightOffset; // Apply height offset for centering
    const orangeBallScaledRadius = orangeBallOriginalRadius * scale;
    
    this.orangeBall = Bodies.circle(
      orangeBallScaledX,
      orangeBallScaledY,
      orangeBallScaledRadius,
      { 
        render: { fillStyle: '#ff9800' },
        frictionAir: 0.01,
        friction: 0.8,
        restitution: 0.5,
        density: 1.0
      }
    );
    World.add(this.world, this.orangeBall);

    console.log('Orange ball created:', {
      original: {
        x: orangeBallOriginalX,
        y: orangeBallOriginalY,
        radius: orangeBallOriginalRadius
      },
      scaled: {
        x: orangeBallScaledX,
        y: orangeBallScaledY,
        radius: orangeBallScaledRadius
      },
      bodyId: this.orangeBall.id,
      position: {
        x: this.orangeBall.position.x,
        y: this.orangeBall.position.y
      },
      circleRadius: (this.orangeBall as any).circleRadius
    });

    // Store scale for later use
    (this as any).scale = scale;

    console.log('Physics world summary:', {
      totalBodies: Composite.allBodies(this.world).length,
      staticBodies: Composite.allBodies(this.world).filter((b: any) => b.isStatic).length,
      dynamicBodies: Composite.allBodies(this.world).filter((b: any) => !b.isStatic).length,
      gravity: this.engine.world.gravity.y
    });
    console.log('=====================================');
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

    // Simplify and optimize points
    const simplifiedPoints = this.simplifyPoints(this.drawingPoints, 8);
    if (simplifiedPoints.length < 2) return;
    
    // Remove duplicate points that are too close
    const cleanedPoints = this.removeClosePoints(simplifiedPoints, 5.5);
    if (cleanedPoints.length < 2) return;
    
    // Create smooth polygon from line points
    const polygonPoints = this.createPolygonFromLine(cleanedPoints, this.SEGMENT_THICKNESS / 2);
    
    if (polygonPoints.length >= 3) {
      // Convert Point[] to {x, y}[]
      const vertices = polygonPoints.map(p => ({ x: p.x, y: p.y }));
      
      try {
        // Create a single polygon body for smoother lines
        const segment = Bodies.fromVertices(
          polygonPoints[0].x,
          polygonPoints[0].y,
          [vertices],
          {
            render: { fillStyle: '#333333' },
            frictionAir: 0.01,
            friction: 0.8,
            restitution: 0.3,
            density: 1.0
          },
          true // flagInternal for better performance
        );
        
        if (segment) {
          // Bodies.fromVertices may return a single Body or array of Bodies
          const segments = Array.isArray(segment) ? segment : [segment];
          
          if (segments.length > 0) {
            segments.forEach((part: Body) => {
              World.add(this.world, part);
              this.lineSegments.push(part);
            });
          } else {
            // Fallback to rectangle segments if polygon creation fails
            this.createRectangleSegments(cleanedPoints);
          }
        } else {
          // Fallback to rectangle segments if polygon creation fails
          this.createRectangleSegments(cleanedPoints);
        }
      } catch (e) {
        // Fallback to rectangle segments if polygon creation fails
        this.createRectangleSegments(cleanedPoints);
      }
    } else {
      // Fallback to rectangle segments if polygon creation fails
      this.createRectangleSegments(cleanedPoints);
    }
  }
  
  // Create polygon outline from line points (inspired by reference code)
  private createPolygonFromLine(points: Point[], thickness: number): Point[] {
    if (points.length < 2) return [];
    
    const topPoints: Point[] = [];
    const bottomPoints: Point[] = [];
    
    // Determine initial direction
    const firstDx = points[1].x - points[0].x;
    const isRight = firstDx > 0;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length < 0.1) continue;
      
      const perpX = -dy / length;
      const perpY = dx / length;
      
      const topX = p2.x + perpX * thickness;
      const topY = p2.y + perpY * thickness;
      const bottomX = p2.x - perpX * thickness;
      const bottomY = p2.y - perpY * thickness;
      
      topPoints.push({ x: topX, y: topY });
      bottomPoints.push({ x: bottomX, y: bottomY });
    }
    
    // Add first point offset
    if (points.length > 0) {
      const firstDx = points.length > 1 ? points[1].x - points[0].x : 1;
      const firstDy = points.length > 1 ? points[1].y - points[0].y : 0;
      const firstLength = Math.sqrt(firstDx * firstDx + firstDy * firstDy);
      
      if (firstLength > 0.1) {
        const perpX = -firstDy / firstLength;
        const perpY = firstDx / firstLength;
        
        topPoints.unshift({
          x: points[0].x + perpX * thickness,
          y: points[0].y + perpY * thickness
        });
        bottomPoints.unshift({
          x: points[0].x - perpX * thickness,
          y: points[0].y - perpY * thickness
        });
      }
    }
    
    // Reverse bottom points and combine
    bottomPoints.reverse();
    return topPoints.concat(bottomPoints);
  }
  
  // Remove points that are too close to each other
  private removeClosePoints(points: Point[], minDistance: number): Point[] {
    if (points.length <= 1) return points;
    
    const result: Point[] = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const lastPoint = result[result.length - 1];
      const currentPoint = points[i];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.x, 2) +
        Math.pow(currentPoint.y - lastPoint.y, 2)
      );
      
      if (distance >= minDistance) {
        result.push(currentPoint);
      }
    }
    
    return result;
  }
  
  // Fallback method: create rectangle segments
  private createRectangleSegments(points: Point[]): void {
    for (let i = 0; i < points.length - 1; i++) {
      if (this.lineSegments.length >= this.MAX_SEGMENTS) break;
      
      const p1 = points[i];
      const p2 = points[i + 1];
      
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
          friction: 0.8,
          restitution: 0.3,
          density: 1.0
        }
      );
      
      World.add(this.world, segment);
      this.lineSegments.push(segment);
    }
  }
  
  // Simplify polyline to create smoother lines with fewer segments
  private simplifyPoints(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    
    const simplified: Point[] = [points[0]];
    let lastKeptIndex = 0;
    
    for (let i = 1; i < points.length - 1; i++) {
      const lastKept = points[lastKeptIndex];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate distance from current point to line between last kept and next
      const dx = next.x - lastKept.x;
      const dy = next.y - lastKept.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) {
        simplified.push(curr);
        lastKeptIndex = i;
        continue;
      }
      
      const distance = Math.abs(
        (dy * curr.x - dx * curr.y + next.x * lastKept.y - next.y * lastKept.x) / length
      );
      
      // Only keep point if it's far enough from the line
      if (distance > tolerance) {
        simplified.push(curr);
        lastKeptIndex = i;
      }
    }
    
    simplified.push(points[points.length - 1]);
    return simplified;
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
    this.showVictoryAnimation = true;
    
    if (this.level) {
      this.progressService.completeLevel(this.level.id);
    }
    
    // Hide animation after delay
    setTimeout(() => {
      this.showVictoryAnimation = false;
    }, 2000);
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
        // Draw circle with shadow for depth
        const vertices = body.vertices;
        let radius = 0;
        if (vertices && vertices.length > 0) {
          radius = Math.sqrt(
            Math.pow(vertices[0].x - body.position.x, 2) + 
            Math.pow(vertices[0].y - body.position.y, 2)
          );
        } else {
          radius = (body as any).circleRadius || 20;
        }
        
        // Draw shadow
        this.ctx.save();
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = (body as any).render?.fillStyle || '#333';
        this.ctx.fill();
        
        // Draw highlight
        this.ctx.beginPath();
        this.ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fill();
        
        this.ctx.restore();
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
    
    // Draw smooth line with shadow
    this.ctx.save();
    this.ctx.shadowBlur = 3;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = this.SEGMENT_THICKNESS;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineJoin = 'miter';
    this.ctx.miterLimit = 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
    for (let i = 1; i < this.drawingPoints.length; i++) {
      this.ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
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
      const heightOffset = (this as any).heightOffset || 0;
      Body.setPosition(this.blueBall, {
        x: this.level.blueBall.x * scale,
        y: this.level.blueBall.y * scale + heightOffset
      });
      Body.setVelocity(this.blueBall, { x: 0, y: 0 });
      Body.setAngle(this.blueBall, 0);
      
      Body.setPosition(this.orangeBall, {
        x: this.level.orangeBall.x * scale,
        y: this.level.orangeBall.y * scale + heightOffset
      });
      Body.setVelocity(this.orangeBall, { x: 0, y: 0 });
      Body.setAngle(this.orangeBall, 0);
    }
    
    this.levelComplete = false;
    this.showVictoryAnimation = false;
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
