/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var GrowingShroom = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

GrowingShroom.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: GrowingShroom
});

GrowingShroom.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.dontBroadcastAggro = true;
    this.monster.xpModifier = 0.0;

    othis.died = false;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.monster.timeAlive > 10) {
            console.log("SHROOM SUICIDE!");
            othis.monster.triggerAnimation("die");
            setTimeout(function() {
                othis.monster.suicide("death");
            }, 500);
            
        }
    });

    this.gameObject.addEventListener("MonsterDeath", function() {
        if(othis.died) return;
        console.log("SHROOM DIED, TIME ALIVE: " + othis.monster.timeAlive);
        othis.died = true;
        var meters = othis.monster.timeAlive * 1.50;
        var nearby = othis.monster.nearbyMonsters(meters, 15, true);
        _.each(nearby, function(targetMonster) {
            var pcc = targetMonster.gameObject.getComponent("PlayerCharacterComponent");
            if(pcc) {
                targetMonster.addStatusEffect(StatusEffects.Effects.Poison, 6, {tickDmg: othis.monster.potencyDamage(100), sourceEntity: othis.blameEntity});
            }
        });

        var nearbyAllies = othis.monster.nearbyMonsters(meters, 11, true);
        _.each(nearbyAllies, function(targetMonster) {
            var bossComponent = targetMonster.gameObject.getComponent("TraduBoss6");
            if(bossComponent) {
                targetMonster.addStatusEffect(StatusEffects.Effects.RunesmithBoost, 10, {dmgBoostPct: 0.75});
            }
        })
    });
}


module.exports = GrowingShroom;
