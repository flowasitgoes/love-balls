import { resources } from 'cc';
import { _decorator, Component } from "cc";
import { CSVManager } from "./csvManager";
import { resourceUtil } from "./resourceUtil";
const { ccclass, property } = _decorator;

@ccclass("localConfig")
export class localConfig {
    /* class member could be defined like this */
    static _instance: localConfig;
    csvManager: CSVManager;
    arrCars: [any];

    static get instance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new localConfig();
        return this._instance;
    }

    _callback: Function = null;
    _skills: any = {};
    currentLoad: number = 0;
    cntLoad: number = 0;
    servers: any = [];

    loadConfig(cb: Function) {
        this._callback = cb;
        this.csvManager = new CSVManager();
        this.loadCSV();
    }

    loadCSV() {
        //新增数据表 请往该数组中添加....
        resources.loadDir("datas", (err: any, assets) => {
            if (err) {
                console.log(err);
                return;
            }
            //+1主要是后续还有技能配置的加载，特殊处理
            this.cntLoad = assets.length;
            //客户端加载
            assets.forEach((item, index, array) => {
                resourceUtil.getData(item.name, (err: any, content: any) => {
                    this.csvManager.addTable(item.name, content);
                    this.tryToCallbackOnFinished();
                });
            });
        })
    }

    queryOne(tableName: string, key: string, value: any) {
        return this.csvManager.queryOne(tableName, key, value);
    }

    queryByID(tableName: string, ID: string) {
        return this.csvManager.queryByID(tableName, ID);
    }

    getTable(tableName: string) {
        return this.csvManager.getTable(tableName);
    }

    getTableArr(tableName: string) {
        return this.csvManager.getTableArr(tableName);
    }

    // 选出指定表里面所有有 key=>value 键值对的数据
    queryAll(tableName: string, key: string, value: any) {
        return this.csvManager.queryAll(tableName, key, value);
    }

    // 选出指定表里所有 key 的值在 values 数组中的数据，返回 Object，key 为 ID
    queryIn(tableName: string, key: string, values: Array<any>) {
        return this.csvManager.queryIn(tableName, key, values);
    }

    // 选出符合条件的数据。condition key 为表格的key，value 为值的数组。返回的object，key 为数据在表格的ID，value为具体数据
    queryByCondition(tableName: string, condition: any) {
        return this.csvManager.queryByCondition(tableName, condition);
    }

    tryToCallbackOnFinished() {
        if (this._callback) {
            this.currentLoad++;
            if (this.currentLoad >= this.cntLoad) {
                this._callback();
            }
        }
    }
}
