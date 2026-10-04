/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss5 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss5.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss5
});

TraduBoss5.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 7;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackPotency = 350;
    //this.monster.basicAttackPotency = 1;

    this.monster.basicAttackEvery = 2.5;
    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing2";
    this.monster.bossTrackingName = "traduboss5";

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;
    //this.tankBusterPotency = 1;

    this.spawnGroundlingEvery = 3;
    this.attacksSinceGroundling = 0;

    this.spawnedMinions = [];
    this.lastSpawnPercent = 1.0;

    this.checkNearbyEvery = 1.5;
    this.timeSinceNearbyCheck = 0;

    setTimeout(function() {
        othis.startPoint = othis.gameObject.getWorldPosition();
    }, 1000);

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceTankBuster++;
        othis.attacksSinceGroundling++;

        if(othis.attacksSinceGroundling > othis.spawnGroundlingEvery) {
            othis.spawnGroundling();
            othis.attacksSinceGroundling = 0;
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
        var healthPercent = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");
        if(healthPercent < 0.75 && othis.lastSpawnPercent == 1.0) {
            othis.spawnMinion("TraduWormSplit", 19);
            othis.lastSpawnPercent = 0.75;
        }
        else if(healthPercent < 0.50 && othis.lastSpawnPercent == 0.75) {
            othis.spawnMinion("TraduWormSplit", 19);
            othis.spawnMinion("TraduWormSplit", 19);
            othis.lastSpawnPercent = 0.50;
        }
        else if(healthPercent < 0.25 && othis.lastSpawnPercent == 0.50) {
            othis.spawnMinion("TraduWormSplit", 19);
            othis.spawnMinion("TraduWormSplit", 19);
            othis.lastSpawnPercent = 0.25;
        }

        othis.timeSinceNearbyCheck += args.delta;

        if(othis.timeSinceNearbyCheck > othis.checkNearbyEvery) {

            var nearbyMonsters = othis.monster.nearbyMonsters(15, 11, true);
            var numSplitWorms = 0;
            _.each(nearbyMonsters, function(amonster) {
                var thisBoss = amonster.gameObject.getComponent("TraduWormSplit") || amonster.gameObject.getComponent("TraduBoss5") || amonster.gameObject.getComponent("WormMini");

                if(thisBoss) {
                    numSplitWorms++;
                }
            });

            othis.monster.basicAttackEvery = Math.max(1.0, 2.5 - (0.25 * numSplitWorms));

            othis.timeSinceNearbyCheck = 0;
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("TRADUBOSS5 NO TARGETS!");
        _.each(othis.spawnedMinions, function(aminion) {
            if(!aminion.isDead) {
                aminion.suicide();
            }
        });
        othis.spawnedMinions = [];
        othis.lastSpawnPercent = 1.0;
    });
};

TraduBoss5.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 2000);
    cb();
}

TraduBoss5.prototype.spawnMinion = function(minionName, minionLevel) {
    console.log("SPAWN MINION: " + minionName);
    var othis = this;
    var aggroTable = othis.monster.getSortedAggroTable();
    var targetGameObject = _.sample(aggroTable);
    var randomval = Math.random() * 4;
    var myworldpos = this.gameObject.transform.position;
    var newent = othis.gameObject.zone.spawnEntity(minionName, new Vector3(myworldpos.x + randomval, myworldpos.y, myworldpos.z + randomval));
    var newmonster = newent.gameObject.getComponent("Monster");
    newmonster.xpModifier = 0;
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
        newmonster.addAggroForEntity(targetGameObject.entity, 100);
    });
    this.spawnedMinions.push(newmonster);
}

TraduBoss5.prototype.spawnGroundling = function() {
    if(this.spawnedMinions.length > 20) return;
    var othis = this;
    var basePosition = this.gameObject.getWorldPosition();
    var entPos = new Vector3(basePosition.x + Math.random() * 30 - 15, basePosition.y, basePosition.z + Math.random() * 30 - 15);
    entPos.y = othis.gameObject.zone.getGroundHeightAt(entPos.x, entPos.z);
    console.log("SPAWN GROUNDLING AT");
    console.log(entPos);
    var newent = othis.gameObject.zone.spawnEntity("WormMini", entPos);
    var newmonster = newent.gameObject.getComponent("Monster");
    var groundling = newent.gameObject.getComponent("WormMini");
    _.defer(function() {
        newmonster.xpModifier = 0;
        newmonster.scaleToLevel(19);
        groundling.parentBoss = othis;
    });
    this.spawnedMinions.push(newmonster);
}

TraduBoss5.prototype.groundlingKilledSelf = function(thisMonster) {
    this.spawnedMinions = _.without(this.spawnedMinions, thisMonster);
};

module.exports = TraduBoss5;
