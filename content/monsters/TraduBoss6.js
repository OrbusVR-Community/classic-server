/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss6 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss6.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss6
});

TraduBoss6.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 9;
    this.monster.setMovementSpeed(7.5);
    this.monster.basicAttackPotency = 350;
    this.monster.basicAttackEvery = 2.5;
    this.monster.giveUpChaseAfter = 60;

    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing1";
    this.monster.bossTrackingName = "traduboss6";

    this.breathEvery = 4;
    this.attacksSinceBreath = 0;
    this.breathSize = 12;
    this.breathCastTime = 2.5;
    this.breathPotency = 800;

    this.spawnEvery = 6;
    this.timeSinceLastSpawn = 20;

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        if(othis.isChasing) return;

        othis.attacksSinceBreath++;
        othis.attacksSinceTankBuster++;

        if(othis.attacksSinceBreath > othis.breathEvery) {
            if(args.takeOpportunity()) {
                othis.attacksSinceBreath = 0;
                othis.breathAttack(args.finishOpportunity);
                return;
            }
        }

        if(othis.attacksSinceTankBuster > othis.tankBusterEvery) {
            if(args.takeOpportunity()) {
                othis.tankBuster(args.finishOpportunity);
                othis.attacksSinceTankBuster = 0;
                return;
            }
        }
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(!othis.monster.trackingTarget) return;
        othis.timeSinceLastSpawn += args.delta;
        if(othis.timeSinceLastSpawn > othis.spawnEvery) {
            othis.timeSinceLastSpawn = 0;
            othis.spawnMinion();
        }
    })

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("TraduBoss6 NO TARGETS!");
    });
};

TraduBoss6.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.transform.position;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "sphere", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        finishCallback();
    });
};


TraduBoss6.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

TraduBoss6.prototype.spawnMinion = function() {
    var minionName = "GrowingShroom";
    var minionLevel = 19;
    console.log("SPAWN MINION: " + minionName);
    var othis = this;
    var basePosition = this.gameObject.getWorldPosition();
    var entPos = new Vector3(basePosition.x + Math.random() * 30 - 15, basePosition.y, basePosition.z + Math.random() * 30 - 15);
    var newent = othis.gameObject.zone.spawnEntity(minionName, entPos);
    var newmonster = newent.gameObject.getComponent("Monster");
    newmonster.xpModifier = 0;
    var shroom = newent.gameObject.getComponent("GrowingShroom");
    shroom.blameEntity = this.gameObject.entity;
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
    });
}

module.exports = TraduBoss6;
