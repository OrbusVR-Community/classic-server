/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;

var GolemBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

GolemBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: GolemBoss
});

GolemBoss.prototype.Start = function() {
    var othis = this;

    this.isWeak = false;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.basicAttackEvery = 3;
    this.monster.basicAttackPotency = 150;
    this.monster.basicAttackDelay = 1.5;
    this.monster.deathDelay = 6;
    this.monster.giveUpChaseAfter = 120;

    this.monster.defaultModifiers.armorBoostPercent = 250.0;

    this.AoeSize = 12;
    this.AoeCastTime = 2.5;
    this.AoePotency = 800;

    this.currentPhase = 1;
    this.phaseTwoSwitchPercent = 0.60;
    this.phaseThreeSwitchPercent = 0.30;

    this.tankbusterEvery = 5;
    this.timeSinceTankbuster = 0;
    this.tankBusterPotency = 800;

    this.addSyncedVar(1, "weak", "bool", false);

    this.gameObject.addEventListener("MonsterNoTargets", function(args) {
        othis.currentPhase = 1;
        var foundOne = false;
        console.log("RESPAWN STALAGMITES");
        _.each(othis.nearbyCeilingSpears(300), function(amonster) {
            var stalComponent = amonster.gameObject.getComponent("GolemBossStal");
            if(!stalComponent) return;
            if(foundOne) return;
            stalComponent.gameObject.entity.spawner.doInitialSpawn = true;
            foundOne = true;
        });
    })

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.timeSinceTankbuster++;

        if(othis.isWeak) {
            //Basically just don't do anything while we're weakened.
            args.takeOpportunity();
            args.finishOpportunity();
            return;
        }

        var currentHealthPct = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");

        if(othis.currentPhase == 1 && currentHealthPct <= othis.phaseTwoSwitchPercent) {
            if(args.takeOpportunity()) {
                othis.currentPhase = 2;
                othis.beginPhaseTwo(args.finishOpportunity);
                return;
            }
        }
        else if(othis.currentPhase === 2 && currentHealthPct <= othis.phaseThreeSwitchPercent) {
           if(args.takeOpportunity()) {
                othis.currentPhase = 3;
                othis.beginPhaseThree(args.finishOpportunity);
                return;
            }
        }

    
        if(othis.timeSinceTankbuster > othis.tankbusterEvery) {
            if(args.takeOpportunity()) {
                othis.tankBuster(args.finishOpportunity);
                othis.timeSinceTankbuster = 0;
            }
        }

    });

}

GolemBoss.prototype.beginPhaseTwo = function (cb) {
    console.log("Begin phase two");
    this.groundSlam(cb);
}

GolemBoss.prototype.beginPhaseThree = function(cb) {
    console.log("Begin phase three");
    this.groundSlam(cb);
}

GolemBoss.prototype.groundSlam = function(finishCallback) {
    var othis = this;
    console.log("AOE ATTACK");
    var AoeCenter = this.gameObject.transform.position;
    this.monster.dangerZone("directional", "sphere", AoeCenter, this.AoeSize, this.AoeCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.AoePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        othis.triggerStalagmites();
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for Aoe attack to finish.
        
    });
};

GolemBoss.prototype.triggerStalagmites = function() {
    //Find nearby stalagmites and trigger them to fall randomly.
    _.each(this.nearbyCeilingSpears(200), function(amonster) {
        var stalComponent = amonster.gameObject.getComponent("GolemBossStal");
        if(!stalComponent) return;
        if(Chance.rollPercentChance(33)) {
            stalComponent.triggerFall();
        }
    });
}

GolemBoss.prototype.triggerWeakness = function() {
    //TODO: Reduce monster armor or something?
    var othis = this;
    this.isWeak = true;
    this.setSyncedVar("weak", true);
    this.monster.defaultModifiers.armorBoostPercent = 1.0;
    console.log("GOLEM BOSS IS WEAK!");
    setTimeout(function() {
        if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
        console.log("GOLEM BOSS IS NO LONGER WEAK!");
        othis.isWeak = false;
        othis.setSyncedVar("weak", false);
        othis.monster.defaultModifiers.armorBoostPercent = 250.0;
    }, 10000);
};

GolemBoss.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

GolemBoss.prototype.nearbyCeilingSpears = function(radius) {
    var nearbyCreatures = this.gameObject.zone.sphereCast(this.gameObject.transform.position, radius);
    var foundCreatures = [];
    _.each(nearbyCreatures, function(creature) {
        var testMonster = creature.orbusCollider.gameObject.getComponent("GolemBossStal");
        if(testMonster == null) return;
        foundCreatures.push(testMonster);
    });

    return foundCreatures;
}

module.exports = GolemBoss;
