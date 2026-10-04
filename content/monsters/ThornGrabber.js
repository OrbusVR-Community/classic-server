/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var ThornGrabber = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

ThornGrabber.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: ThornGrabber
});

ThornGrabber.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.dontBroadcastAggro = true;
    this.monster.hasAggroTable = false;
    //this.monster.xpModifier = 0.0;

    this.monster.PreAttackCallback = function(dmgAmount, currentHp, attackingMonster) {
        if(attackingMonster == othis.targetMonster) {
            return 0;
        }
        else {
            return dmgAmount;
        }
    }; //don't allow us to attack our own thorns

    this.maxTimeToLive = 20;
    this.timeAlive = 0;

    this.gameObject.addEventListener("MonsterDeath", function() {
        othis.targetMonster && othis.targetMonster.removeStatusEffectByType(1, 1); //remove the bind we put on you.
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        othis.timeAlive += args.delta;
        if(!othis.monster.isDead && othis.timeAlive > othis.maxTimeToLive) {
            othis.monster.suicide();
        }
    });
}

ThornGrabber.prototype.Setup = function(targetPlayerMonster) {
    this.targetMonster = targetPlayerMonster;
    this.targetMonster.addStatusEffect(StatusEffects.Effects.Bind, this.maxTimeToLive, {sourceEntity: this.gameObject.entity});

    this.gameObject.ignoreCollisionsWith = new Set();
    this.gameObject.ignoreCollisionsWith.add(this.targetMonster.gameObject);
}


module.exports = ThornGrabber;
