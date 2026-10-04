/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var NecroBoss2 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroBoss2.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroBoss2
});

NecroBoss2.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackEvery = 2.5;

    if(this.gameObject.zone.zoneInfo.raidLevel === "expert") {
        this.monster.individualScaling = 3.2;
        this.monster.lootLevel = 21.4;
        this.monster.lootDungeonName = "necroboss2expert";
        this.spawnEvery = 18;
        this.numMinionsToSpawn = 7;
        this.monster.basicAttackPotency = 350;
        this.monster.lootTier = 9;
    }
    else if(this.gameObject.zone.zoneInfo.raidLevel === "hard") {
        this.monster.individualScaling = 2.2;
        this.monster.lootLevel = 21.2;
        this.monster.lootDungeonName = "necroboss2hard";
        this.spawnEvery = 20;
        this.numMinionsToSpawn = 6;
        this.monster.basicAttackPotency = 300;
        this.monster.lootTier = 9;
    }
    else {
        this.monster.individualScaling = 1.25;
        this.monster.lootLevel = 20.50;
        this.monster.lootDungeonName = "necroboss2";
        this.spawnEvery = 30; //was 20
        this.numMinionsToSpawn = 5; //was 6
        this.monster.basicAttackPotency = 250; //was 350
        this.monster.lootTier = 8;
    }

    setTimeout(function() {
        othis.monster.initStats({baseVitality: 8240 * 7 * 2.0}); //scale up for 10 (instead of 5 players) @ level 20 base, individual scaling will be applied on top of that.
    }, 0);
    this.monster.aggroOnSight = false;

    this.monster.bossTrackingName = "necroboss2";

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.soulSuckEvery = 5; //was 4
    this.attacksSinceSoulSuck = 0;
    this.soulsuckRadius = 8;
    this.soulsuckCastTime = 2;
    this.soulsuckPotency = 1600;

    this.spawnedMinions = [];
    
    this.timeSinceLastSpawn = 0;
    this.minionSpawnPoint = new Vector3(724.63, 12.8, 259);

    this.clearStatusEffectEvery = 20;
    this.timeSinceLastClear = 10; //make sure we do this 10 seconds after minions spawn.

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceTankBuster++;
        othis.attacksSinceSoulSuck++;

        if(othis.attacksSinceTankBuster > othis.tankBusterEvery) {
            if(args.takeOpportunity()) {
                othis.tankBuster(args.finishOpportunity);
                othis.attacksSinceTankBuster = 0;
                return;
            }
        }

        if(othis.attacksSinceSoulSuck > othis.soulSuckEvery) {
            if(args.takeOpportunity()) {
                var aggroTable = othis.monster.getSortedAggroTable();
                var targetGameObject = _.sample(aggroTable);
                if(!targetGameObject) return;
                othis.teleportBehindTarget(targetGameObject.targetGo);
                setTimeout(function() {
                    if(!othis.monster || othis.monster.isDead) return;
                    othis.soulSuck(args.finishOpportunity);
                }, 500);
                othis.attacksSinceSoulSuck = 0;
                return;
            }
        }
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(!othis.monster.trackingTarget) return;

        othis.timeSinceLastSpawn += args.delta;
        othis.timeSinceLastClear += args.delta;
        if(othis.timeSinceLastSpawn > othis.spawnEvery) {
            othis.monster.triggerAnimation("summon");
            for(var i=0; i < othis.numMinionsToSpawn; i++) {
                othis.spawnMinion();
            }
            othis.timeSinceLastSpawn = 0;
        }
        if(othis.timeSinceLastClear > othis.clearStatusEffectEvery) {
            othis.timeSinceLastClear = 0;
            othis.monster.removeStatusEffectByType(55); //clear all vindictive
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("NecroBoss2 NO TARGETS!");
        _.each(othis.spawnedMinions, function(aminion) {
            if(!aminion.isDead) {
                aminion.suicide();
            }
        });
        othis.spawnedMinions = [];
        othis.attacksSinceSoulSuck = 0;
        othis.attacksSinceTankBuster = 0;
        othis.timeSinceLastSpawn = 0;
    });
}

NecroBoss2.prototype.soulSuck = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    // var suckCenter = this.gameObject.transform.position;
    // this.broadcastToActiveClients(1, ["float", "float"], [this.soulsuckRadius, this.soulsuckCastTime]); 

    this.monster.dangerZone("directional", "sphere", this.gameObject.transform.position, this.soulsuckRadius, this.soulsuckCastTime, 1, function(collisionObjs) {
        var soulsuckDamage = othis.monster.potencyDamage(othis.soulsuckPotency);
        var targetsHit = 0;
        _.each(collisionObjs, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "magical"});
            targetsHit++;
        });
        //Heal myself based ont he amount of targets I hit.
        othis.gameObject.triggerEvent("TakeDamage", {dmgAmount: -1 * targetsHit * soulsuckDamage * 0.5, dmgType: "magical"});
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath animation to finish before we make our next move.
    });
};

NecroBoss2.prototype.teleportBehindTarget = function(targetObj) {
    console.log("TELEPORTING BEHIND " + targetObj.name);
    this.monster.cancelPathfinding();
    var forward = (targetObj.entity.head ? targetObj.entity.head.forward() : targetObj.forward());
    var destPos = targetObj.getWorldPosition().sub(forward.normalize().multiplyScalar(2));
    this.gameObject.transform.setNewPosition(destPos);
    this.monster.navagent.snapToGrid();
}

NecroBoss2.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 2000);
    cb();
}

NecroBoss2.prototype.spawnMinion = function() {
    var minionName = "NecroMini";
    var minionLevel = 20;
    console.log("SPAWN MINION: " + minionName);
    var othis = this;
    var aggroTable = othis.monster.getSortedAggroTable();
    var targetGameObject = _.sample(aggroTable);
    var newent = othis.gameObject.zone.spawnEntity(minionName, new Vector3(Math.random() * 60 - 30, 0, Math.random() * 60 - 30).add(othis.minionSpawnPoint));
    var newmonster = newent.gameObject.getComponent("Monster");
    newmonster.individualScaling = 1.25;
    newmonster.xpModifier = 0;
    _.defer(function() {
        newmonster.scaleToLevel(minionLevel);
        if(targetGameObject) {
            newmonster.addAggroForEntity(targetGameObject.entity, 100);
        }
    });
    this.spawnedMinions.push(newmonster);
}

module.exports = NecroBoss2;
