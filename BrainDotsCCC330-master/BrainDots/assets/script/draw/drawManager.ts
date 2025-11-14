import { _decorator, Prefab, v2, v3, Vec2, Vec3 } from 'cc';

import { Constant } from '../framework/constant';
import { resourceUtil } from '../framework/resourceUtil';

const { ccclass, property } = _decorator;

@ccclass('DrawManager')
export class DrawManager  {
    private static _instance:DrawManager;
    public static get Inst():DrawManager{
        if(!this._instance){
            this._instance = new DrawManager();
        }
        this._instance._init();
        return this._instance;
    }

    private _drawNodePre:Prefab = null;//画线预制体
    private _unitPre:{} = {};
    private _posList:Vec2[] = [];//画线，线上的点

    private async _init(){
        if(!this._drawNodePre){
            this._drawNodePre = await resourceUtil.loadUnitRes(Constant.resUnit.drawNode);
        }

        for(let res in Constant.resUnit){
            this._unitPre[res] = await resourceUtil.loadUnitRes(res);
        }
    }

    /**
     * 获取Unit预制体
     * @returns 
     */
    public getUnitPre(name:string):any{
        return this._unitPre[name];
    }


     /**
     * 将线上的点转换成围绕线一圈的点
     */
      public handlePointList(posList:Vec2[]){
        this._posList = posList;
        let dis = 5;
        let firstDis = 0;
        let pointOne = this._posList[0];
        //第一个点朝后拉
        let temp = [
            v2(pointOne.x-dis,pointOne.y+dis),
        ];
        let temp1 = [];
        for(let i = 0; i<this._posList.length-1;i++){
            let j = i+1;
            let pos1 = this._posList[i];
            let pos2 = this._posList[j];
            
            let disx = Math.floor(pos2.x - pos1.x);
            let disy = Math.floor(pos2.y - pos1.y);
            if(i == 0){//用第一个测距来判断走向
                firstDis = disx;
            }
            // console.log('disx: '+disx+"   disy: "+disy); 
            let top =  v2(pos2.x,pos2.y);
            let down = v2(pos2.x,pos2.y);
            if(firstDis>0){//朝右
                let pData = this._handleAroundPointRight(top,down,disx,disy);
                temp.push(pData.top);
                temp1.push(pData.down);
            }
            else{
                disx = -disx;
                let pData = this._handleAroundPointLeft(top,down,disx,disy);
                temp.push(pData.top);
                temp1.push(pData.down);
            }
        }
        /* 将挨的太近的点移除 */
        this._deleteDuplicates(temp);
        this._deleteDuplicates(temp1);
        //线下面的点反转形成包围
        temp1 = temp1.reverse();
        this._posList = temp.concat(temp1);
        /* 将挨的太近的点移除 */
        this._deleteDuplicates(this._posList);
        return this._posList;
        // if(this.debug){
        //     temp.forEach(item=>{
        //         let nd = instantiate(this.pointPre);
        //         nd.getComponent(Sprite).color = Color.BLUE;
        //         nd.setPosition(new Vec3(item.x,item.y));
        //         this._drawNode.addChild(nd);
        //     })
        //     temp1.forEach(item=>{
        //         let nd = instantiate(this.pointPre);
        //         nd.getComponent(Sprite).color = Color.YELLOW;
        //         nd.setPosition(new Vec3(item.x,item.y));
        //         this._drawNode.addChild(nd);
        //     })
        // }
    }

    private _handleAroundPointLeft(top:Vec2,down:Vec2,disx:number,disy:number):{top:Vec2,down:Vec2}{
        let dis = 5;
        if(disx >= 5){
            top.y+=dis;
            down.y-=dis;
        }
        else if(disx >= 0 && disx<5){
            if(disy<0){//朝下
                top.x-=dis;
                down.x+=dis;
            }
            else{//朝上
                top.x+=dis;
                down.x-=dis;
            }
        }
        else{
            if(disx <= -5){
                top.y-=dis;
                down.y+=dis;
            }
            else{
                if(disy<0){//朝下
                    top.x-=dis;
                    down.x+=dis;
                }
                else{//朝上
                    top.x+=dis;
                    down.x-=dis;
                }
            }
        }
        return {top:top,down:down}
    }
    
    private _handleAroundPointRight(top:Vec2,down:Vec2,disx:number,disy:number):{top:Vec2,down:Vec2}{
        let dis = 5;
        if(disx >= 5){
            top.y+=dis;
            down.y-=dis;
        }
        else if(disx >= 0 && disx<5){
            if(disy<0){//朝下
                top.x+=dis;
                down.x-=dis;
            }
            else{//朝上
                top.x-=dis;
                down.x+=dis;
            }
        }
        else{
            if(disx <= -5){
                top.y-=dis;
                down.y+=dis;
            }
            else{
                if(disy<0){//朝下
                    top.x+=dis;
                    down.x-=dis;
                }
                else{//朝上
                    top.x-=dis;
                    down.x+=dis;
                }
            }
        }
        return {top:top,down:down}
    }

    /**
     * 将挨的太近前后两个的点移除
     * @param temp 
     */
     private _deleteDuplicates(temp:any[]){
        let bool = true;
        do {
            let len = 0;
            for(let i = 0; i<temp.length-1;i++){
                let j = i+1;
                len = j;
                let distance = Vec3.distance(v3(temp[i].x,temp[i].y,0),v3(temp[j].x,temp[j].y,0));
                if(distance<5.5){
                    temp.splice(i,1);
                    bool = true;
                    break;
                }
                else if(j == temp.length -1){
                    bool = false;
                }
            }
            if(temp.length <= 1)bool = false;
        }
        while(bool);
    }
    /**
     * 检测每个点与其他点的距离，太小的移除掉
     * @param temp 
     */
     private _deleteDuplicatesAll(){
        let temp = this._posList;
        let bool = true;
        do {
            let i = 0;
            let j = 0;
            lb:
            for( i = 0; i<temp.length-1;i++){
                for(j = i+1;j<temp.length;j++){
                    let distance = Vec3.distance(v3(temp[i].x,temp[i].y,0),v3(temp[j].x,temp[j].y,0));
                    if(distance<10){
                        temp.splice(j,1);
                        bool = true;
                        break lb;
                    }
                }
            }
            if(i == temp.length-1 )bool = false;
            if(temp.length <= 1)bool = false;
        }
        while(bool);
    }
}
