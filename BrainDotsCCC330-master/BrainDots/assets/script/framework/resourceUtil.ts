import {
    _decorator,
    Color,
    error,
    find,
    ImageAsset,
    instantiate,
    isValid,
    Node,
    Prefab,
    resources,
    SpriteComponent,
    SpriteFrame,
    Texture2D,
} from 'cc';

const { ccclass } = _decorator;

@ccclass("resourceUtil")
export class resourceUtil {
    /**
     * 加载资源
     * @param url   资源路径
     * @param type  资源类型
     * @param cb    回调
     * @method loadRes
     */
    public static loadRes(url: string, type: any, cb: Function) {
        resources.load(url, (err: any, res: any) => {
            if (err) {
                error(err.message || err);
                cb(err, res);
                return;
            }

            cb(null, res);
        })
    }

    public static loadUnitRes(modulePath: string):Promise<Prefab> {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/unit/${modulePath}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error('effect load failed', modulePath);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    public static loadModelRes(modulePath: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/model/${modulePath}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error("model load failed", modulePath);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    public static loadMapModelRes(modulePath: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`map/${modulePath}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error("map model load failed", modulePath);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }
    public static loadSpriteFrameRes(path: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(path, SpriteFrame, (err: any, img: ImageAsset) => {
                if (err) {
                    console.error('spriteFrame load failed!', path, err);
                    reject && reject();
                    return;
                }

                let texture = new Texture2D();
                texture.image = img;

                let sf = new SpriteFrame();
                sf.texture = texture;

                resolve && resolve(sf);
            })
        })
    }

    public static setAvatarIcon(name: string, sprite: SpriteComponent, cb?: Function) {
        this.loadSpriteFrameRes(`textures/avatar/${name}`).then((sf) => {
            if (sprite && isValid(sprite)) {
                sprite.spriteFrame = sf as SpriteFrame;
                cb && cb();
            } else {
                console.log("sprite is null");
            }
        })
    }

    public static getMap(level: number, cb: Function) {
        let levelStr = 'map';
        //前面补0
        if (level >= 100) {
            levelStr += level;
        } else if (level >= 10) {
            levelStr += '0' + level;
        } else {
            levelStr += '00' + level;
        }

        this.loadRes(`map/config/${levelStr}`, null, (err, txtAsset) => {
            if (err) {
                cb(err, txtAsset);
                return;
            }

            let content = '';
            if (txtAsset._file) {
                if (window['LZString']) {
                    content = window['LZString'].decompressFromEncodedURIComponent(txtAsset._file);
                }
                var objJson = JSON.parse(content);
                cb(null, objJson);
            } else if (txtAsset.text) {
                if (window['LZString']) {
                    content = window['LZString'].decompressFromEncodedURIComponent(txtAsset.text);
                }
                var objJson = JSON.parse(content);
                cb(null, objJson);
            } else if (txtAsset.json) {
                cb(null, txtAsset.json);
            } else {
                cb('failed');
            }
        });
    }

    public static getUIPrefabRes(prefabPath: string, cb?: Function) {
        this.loadRes("prefab/ui/" + prefabPath, Prefab, cb);
    }

    public static createUI(path: string, cb?: Function, parent?: Node) {
        this.getUIPrefabRes(path, function (err, prefab) {
            if (err) return;
            var node = instantiate(prefab);
            node.setPosition(0, 0, 0);
            if (!parent) {
                parent = find("Canvas") as Node;
            }

            parent.addChild(node);
            cb && cb(null, node);
        });
    }

    public static getUICar(name: string, cb: Function) {
        this.loadRes(`prefab/ui/car/uiCar${name}`, Prefab, cb);
    }

    public static getCar(name: string, cb: Function) {
        this.loadRes(`prefab/car/car${name}`, Prefab, cb);
    }

    public static setCarIcon(name: string, sprite: SpriteComponent, isBlack: boolean, cb: Function) {
        let path = `gamePackage/texture/car/car${name}`;
        if (isBlack) {
            path += 'Black';
        }

        this.setSpriteFrame(path, sprite, cb);
    }

    public static getJsonData(fileName: string, cb: Function) {
        resources.load("datas/" + fileName, function (err, content: any) {
            if (err) {
                error(err.message || err);
                return;
            }

            if (content.json) {
                cb(err, content.json);
            } else {
                cb('failed!!!');
            }
        });
    }

    public static getData(fileName: string, cb: Function) {
        resources.load("datas/" + fileName, function (err, content: any) {
            if (err) {
                error(err.message || err);
                return;
            }

            var text = content.text;

            if (!text) {
                resources.load(content.nativeUrl, function (err, content) {
                    text = content;
                    cb(err, text);
                });
                return;
            }
            // console.log("------  " + fileName + "  ------");
            // console.log(text);
            cb(err, text);
        });
    }

    public static setSpriteFrame(path: string, sprite: SpriteComponent, cb: Function) {
        sprite.node.active = false;

        this.loadRes(path + '/spriteFrame', SpriteFrame, (err: any, spriteFrame: SpriteFrame) => {
            if (err) {
                console.error('set sprite frame failed! err:', path, err);
                cb(err);
                return;
            }

            if (sprite && isValid(sprite)) {
                sprite.spriteFrame = spriteFrame;
                sprite.node.active = true;
                cb(null);
            }
        });
    }

    /**
     * 获取顾客预制体
     *
     * @static
     * @param {string} name
     * @param {Function} cb
     * @memberof resourceUtil
     */
    public static getCustomer(name: string, cb: Function) {
        this.loadRes(`gamePackage/map/customer/customer${name}`, Prefab, cb);
    }

    public static setCustomerIcon(name: string, sprite: SpriteComponent, cb: Function) {
        let path = `gamePackage/texture/head/head${name}`;

        this.setSpriteFrame(path, sprite, cb);
    }

    public static getEffect(name: string, cb: Function) {
        this.loadRes(`prefab/effect/${name}`, Prefab, cb);
    }

    /**
 * sprite置灰或者复原
 *
 * @param {object} node
 * @param {boolean} flag
 */
    public static setGray(node: Node, flag: boolean) {
        var sprites = node.getComponentsInChildren(SpriteComponent);
        for (var i = 0; i < sprites.length; ++i) {
            var sprite = sprites[i];
            if (flag) {
                sprite.color = new Color(255, 255, 255, 255);
            } else {
                sprite.color = new Color(124, 124, 124, 255);
            }
        }
    }

    /**
     * 获取帽子prefab
     * @param name 帽子名称
     * @param cb 
     * @returns 
     */
    public static getHat(name: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/model/hat/${name}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error('model load failed', name);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    /**
    * 获取鞋子prefab
    * @param name 鞋子名称
    * @param cb 
    * @returns 
    */
    public static getShoes(name: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/model/shoes/${name}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error('model load failed', name);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }
}
