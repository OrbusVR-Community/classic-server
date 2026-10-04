/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var TraduTurret = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
    this.seekNewTargetEvery = 2;
    this.timeSinceNewTarget = 1000;
    this.targetAttackRadius = 20;
};

TraduTurret.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduTurret
});

TraduTurret.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.attackBasedOnAggro = false;
    this.monster.setMovementSpeed(0);
    this.monster.trackingDistance = this.targetAttackRadius;
    this.monster.basicAttackPotency = 250;
    this.monster.basicAttackEvery = 1;
    this.monster.sleepAfter = 0;
    this.monster.isSleeping = false;
    this.monster.hasAggroTable = false;
    this.monster.disallowCrowdControl = true;

    this.addSyncedVar(1, "aboveGround", "bool", false);

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        othis.timeSinceNewTarget += args.delta;

        if(othis.timeSinceNewTarget > othis.seekNewTargetEvery) {
            var nearby = othis.monster.nearbyMonsters(othis.targetAttackRadius, 15);
            
            nearby = _.sortBy(nearby, function(amonster) {
                return amonster.getSyncedVar("hitPoints") / amonster.getSyncedVar("maxHitPoints");
            });

            if(nearby.length > 0) {
                var newtarget = nearby[0]; 
                othis.monster.setTrackingTarget(newtarget.gameObject);
                othis.timeSinceNewTarget = 0;
                othis.setSyncedVar("aboveGround", true);
                othis.gameObject.layer = 11;
            }
            else if(othis.monster.trackingTarget != null) {
                othis.monster.clearTrackingTarget();
                othis.setSyncedVar("aboveGround", false);
                othis.gameObject.layer = 99;
            }
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        othis.setSyncedVar("aboveGround", false);
        othis.gameObject.layer = 99;
    });
    
    // this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
    //     args.takeOpportunity();
    //     othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: othis.monster.potencyDamage(othis.monster.basicAttackPotency), ignoreAggro: true, sender: othis.blameEntity, dmgType: "magical"}, 500);
    //     args.finishOpportunity();
    // });
}


module.exports = TraduTurret;