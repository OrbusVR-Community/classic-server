/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var RootBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

RootBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: RootBoss
});

RootBoss.prototype.Start = function() {
    var othis = this;

    this.addSyncedVar(1, "isWeak", "bool", false);

    this.minionsToDestroy = [];

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.basicAttackEvery = 6.0;
    this.monster.basicAttackPotency = 0;
    this.monster.trackingDistance = 100;
    this.monster.setMovementSpeed(0);
    this.monster.giveUpChaseAfter = 100;
    this.monster.roamDistance = 0;
    this.monster.defaultModifiers.armorBoostPercent = 500.0;

    this.timeSincePoisonCloud = 0;
    this.poisonCloudEvery = 60;

    this.isEngaged = false;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSincePoisonCloud += args.delta;

        if(!othis.isEngaged) {
            othis.nextWave();
            othis.isEngaged = true;
        }

        if(othis.getSyncedVar("isWeak") === true) {
            //Basically just don't do anything while we're weakened.
            args.takeOpportunity();
            args.finishOpportunity();
        }
        else if(othis.timeSincePoisonCloud > othis.poisonCloudEvery) {
            othis.spawnPoisonCloud();
            othis.timeSincePoisonCloud = 0;
            args.takeOpportunity();
            setTimeout(function() {
                args.finishOpportunity();
            }, 2000);
        }
        else {
            args.takeOpportunity();
            othis.spawnSeed();
            args.finishOpportunity();

        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function(args) {
        console.log("ROOT BOSS MONSTER NO TARGETS");
        othis.isEngaged = false;
        _.each(othis.minionsToDestroy, function(aminion) {
            if(!aminion.gameObject) return;
            var amonster = aminion.gameObject.getComponent("Monster");
            if(amonster) {
                amonster.suicide();
            }
            else {
                aminion.selfDestruct();
            }
        });

        othis.minionsToDestroy = [];
    });
}

RootBoss.prototype.trackMinion = function(aminion) {
    var othis = this;
    aminion.gameObject.addEventListener("MonsterDeath", function() {
        othis.minionsToDestroy = _.without(othis.minionsToDestroy, aminion);
    });
    this.minionsToDestroy.push(aminion);
}

RootBoss.prototype.spawnSeed = function() {
    console.log("ROOT BOSS SPAWNING SEED!");
    this.monster.triggerAnimation("seedattack");
    var shootDirection = new Vector3((Math.random() - 0.4) * 0.4, -0.5, (Math.random() - 0.4) * 0.4).normalize();
    var newminion = this.gameObject.zone.spawnEntity("RootBossSeed", this.gameObject.getWorldPosition());
    var newmonster = newminion.gameObject.getComponent("Monster");
    newmonster.scaleToLevel(this.monster.getSyncedVar("willLevel"));
    newmonster.xpModifier = 0.0;
    var seedComponent = newminion.gameObject.getComponent("RootBossSeed");
    seedComponent.fallDirection = shootDirection;
    seedComponent.myBoss = this;
    this.trackMinion(newminion);
}

RootBoss.prototype.spawnPoisonCloud = function() {
    console.log("TODO: SPAWN POISON CLOUD!");
}

RootBoss.prototype.nextWave = function() {
    var othis = this;
    var numToSpawn = 5;
    var numKilled = 0;

    for(var i=0; i < numToSpawn; i++) {
        (function() {
            var rootMinion = othis.spawnRoot();
            rootMinion.gameObject.addEventListener("MonsterDeath", function() {
                othis.minionsToDestroy = _.without(othis.minionsToDestroy, rootMinion);
                numKilled++;
                console.log("NUM KILLED: " + numKilled + " of " + numToSpawn);
                if(numKilled >= numToSpawn && othis.isEngaged) {
                    console.log("WAVE COMPLETE!");
                    othis.beginWeakness();
                }
            });
            rootMinion.gameObject.addEventListener("TakeDamage", function(args) {
                if(args.sender) {
                    othis.monster.addAggroForEntity(args.sender, 1); //make sure we're getting aggro on stuff even if they don't attack us directly.
                }
            });
            othis.minionsToDestroy.push(rootMinion);
        })();
    }
}

RootBoss.prototype.beginWeakness = function() {
    var othis = this;
    console.log("ROOT BOSS WEAKNESS!");
    this.setSyncedVar("isWeak", true);
    this.monster.defaultModifiers.armorBoostPercent = 1.0;
    setTimeout(function() {
        if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
        console.log("ROOT BOSS IS NO LONGER WEAK!");
        othis.setSyncedVar("isWeak", false);
        othis.monster.defaultModifiers.armorBoostPercent = 500.0;
        othis.nextWave();
    }, 16000);

}

RootBoss.prototype.spawnRoot = function() {
    console.log("Spawning root!");
    var randX = Math.random() - 0.5;
    var randZ = Math.random() - 0.5;

    var spawnPos = new Vector3(25 * randX, 0, 25 * randZ).add(this.gameObject.getWorldPosition());
    var groundHeight = this.gameObject.zone.getGroundHeightAt(spawnPos.x, spawnPos.z);
    spawnPos.y = groundHeight;

    var newminion = this.gameObject.zone.spawnEntity("RootManMini", spawnPos);
    var newmonster = newminion.gameObject.getComponent("Monster");
    newmonster.scaleToLevel(this.monster.getSyncedVar("willLevel"));
    newmonster.xpModifier = 0.0;

    return newminion;
}


module.exports = RootBoss;
