/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var TraduBox = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBox.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBox
});

TraduBox.prototype.Start = function() {
    var othis = this;

    this.timeAlive = 0;
    this.killedSelf = false;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.killedSelf) return;
        othis.timeAlive += args.delta;
        if(othis.timeAlive > 10) {
            console.log("TRADU BOX KILLING SELF");
            othis.killedSelf = true;
            othis.gameObject.entity.selfDestruct();
        }
    });
}


module.exports = TraduBox;
