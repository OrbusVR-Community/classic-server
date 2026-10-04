/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss7 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss7.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss7
});

TraduBoss7.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 9;
    this.monster.setMovementSpeed(7.5);
    this.monster.basicAttackPotency = 350;
    this.monster.basicAttackEvery = 2.5;
    this.monster.giveUpChaseAfter = 100;

    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing3";
    this.monster.bossTrackingName = "traduboss7";

    this.breathEvery = 7;
    this.attacksSinceBreath = 0;
    this.breathSize = 12;
    this.breathCastTime = 2.5;
    this.breathPotency = 1000;

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.spawnedMinions = [];
    this.spawnEvery = 4;
    this.timeSinceLastSpawn = 0;

    this.spawnedPools = [];
    this.spawnPoolEvery = 6.0;
    this.timeSinceLastPoolSpawn = 0.0;
    this.poolPotency = 300;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceBreath++;
        othis.attacksSinceTankBuster++;

        // if(othis.attacksSinceBreath > othis.breathEvery) {
        //     if(args.takeOpportunity()) {
        //         othis.attacksSinceBreath = 0;
        //         othis.breathAttack(args.finishOpportunity);
        //         return;
        //     }
        // }

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
        othis.timeSinceLastPoolSpawn += args.delta;
        if(othis.timeSinceLastSpawn > othis.spawnEvery) {
            othis.timeSinceLastSpawn = 0;
            othis.spawnMinion();
        }
        if(othis.timeSinceLastPoolSpawn > othis.spawnPoolEvery) {
            othis.timeSinceLastPoolSpawn = 0;
            othis.spit();
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("TraduBoss7 NO TARGETS!");
        _.each(othis.spawnedMinions, function(aminion) {
            if(!aminion.isDead) {
                aminion.suicide();
            }
        });
        _.each(othis.spawnedPools, function(apool) {
            if(apool && apool.gameObject) {
                if(apool && apool.gameObject && apool.gameObject.entity) apool.gameObject.entity.selfDestruct();
            }
        });
        othis.spawnedMinions = [];
        othis.spawnedPools = [];
    });
};

TraduBoss7.prototype.breathAttack = function(finishCallback) {
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

TraduBoss7.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

TraduBoss7.prototype.spawnMinion = function() {
    var minionName = "SquidMini";
    var minionLevel = 19;
    console.log("SPAWN MINION: " + minionName);
    var othis = this;
    var basePosition = this.gameObject.getWorldPosition();
    var entPos = new Vector3(basePosition.x + Math.random() * 30 - 15, basePosition.y, basePosition.z + Math.random() * 30 - 15);
    var newent = othis.gameObject.zone.spawnEntity(minionName, entPos);
    var newmonster = newent.gameObject.getComponent("Monster");
    newmonster.xpModifier = 0;
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
    });
    this.spawnedMinions.push(newmonster);
}

TraduBoss7.prototype.spit = function() {

    var othis = this;

    //this.monster.triggerAnimation("spit");

    var targetPos = this.gameObject.getWorldPosition().add(this.gameObject.forward().multiplyScalar(5.0));
    console.log(targetPos);

    var newminion = this.gameObject.zone.spawnEntity("DecursablePool", targetPos);
    var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
    dangerPoolComponent.Setup(5.0, this.monster.potencyDamage(othis.poolPotency), this.gameObject.entity);
    this.spawnedPools.push(dangerPoolComponent);
}

module.exports = TraduBoss7;
