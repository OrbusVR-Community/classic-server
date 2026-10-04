/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var MagicCougar = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicCougar.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicCougar
});

MagicCougar.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        if(othis.monster.trackingTarget) {
            othis.monster.trackingTarget.addStatusEffect(StatusEffects.Effects.Slow, 4, {sourceEntity: othis.gameObject.entity, slowPercentage: -0.25});
        }
    });
}


module.exports = MagicCougar;
