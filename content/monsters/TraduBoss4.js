/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss4 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss4.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss4
});

TraduBoss4.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.5);
    this.monster.basicAttackPotency = 350;
    this.monster.basicAttackEvery = 2.5;
    this.monster.giveUpChaseAfter = 150;

    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing1";
    this.monster.bossTrackingName = "traduboss4";

    this.tankBusterEvery = 4;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.nextFeedPercent = 0.75;
    this.feedingFor = 0;
    this.finishFeedingAfter = 20;
    this.isFeeding = false;
    this.feedingCallback = null;
    this.currentTank = null;
    this.timeSinceFeedingBuff = 0;
    this.buffEvery = 4;

    this.leapEvery = 4;
    this.attacksSinceLeap = 0;
    this.leapPotency = 400;

    this.breathEvery = 5;
    this.attacksSinceBreath = 0;
    this.breathSize = 12;
    this.breathCastTime = 2.5;
    this.breathPotency = 1000;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        if(othis.isFeeding) {
            return;
        }

        othis.attacksSinceTankBuster++;
        othis.attacksSinceLeap++;
        othis.attacksSinceBreath++;

        var healthPercent = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");
        if(healthPercent > 0.10 && healthPercent < othis.nextFeedPercent) {
            console.log("GO FEED!");
            var availableTanks = othis.monster.nearbyMonsters(200, 99, true);
            var foundTank = false;
            _.each(availableTanks, function(aMonster) {
                var lunchTankComponent = aMonster.gameObject.getComponent("LunchTank");
                if(lunchTankComponent && lunchTankComponent.usedUp == false) {
                    foundTank = lunchTankComponent;
                }
            });
            if(foundTank) {
                console.log("FEEDING ON TANK!");
                othis.nextFeedPercent = othis.nextFeedPercent - 0.25;
                othis.currentTank = foundTank;
                othis.currentTank.startFeeding(othis);
                othis.feedingFor = 0;
                othis.timeSinceFeedingBuff = 0;
                args.takeOpportunity();
                othis.feedingCallback = args.finishOpportunity;
                othis.feedOnTarget(foundTank.gameObject);
            }
            else {
                console.log("WANTED TO FEED BUT NO TANK FOUND!");
            }
        }

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

        if(othis.attacksSinceLeap > othis.leapEvery) {
            if(args.takeOpportunity()) {
                othis.monster.aggroRandomTargetFromTable(othis.monster.potencyDamage(500), true);
                othis.monster.attackTopAggroPlayer();
                othis.leapAtTarget(othis.monster.trackingTarget, args.finishOpportunity);
                othis.attacksSinceLeap = 0;
                othis.attacksSinceTankBuster = 3; //never tank buster right after leap
                return;
            }
        }
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.isFeeding) {
            othis.feedingFor += args.delta;
            if(othis.feedingFor > 6) {
                othis.timeSinceFeedingBuff += args.delta;
                if(othis.timeSinceFeedingBuff > othis.buffEvery) {
                    othis.timeSinceFeedingBuff = 0;
                    //ADD BUFF!
                    console.log("HEALING BUFF!");
                    othis.monster.addStatusEffect(StatusEffects.Effects.RunesmithBoost, 30, {dmgBoostPct: 1.0});
                    othis.monster.addStatusEffect(StatusEffects.Effects.Renew, 2, {tickDmg: othis.monster.potencyHealing(10000), sourceEntity: othis.gameObject.entity});
                }
            }
            if(othis.feedingFor > othis.finishFeedingAfter) {
                othis.finishedFeeding();
            }
        }
    })

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        //Reset all tanks
        othis.nextFeedPercent = 0.75;
        othis.feedingFor = 0;
        othis.timeSinceFeedingBuff = 0;
        var availableTanks = othis.monster.nearbyMonsters(300, 99, true);
        _.each(availableTanks, function(aMonster) {
            var lunchTankComponent = aMonster.gameObject.getComponent("LunchTank");
            if(lunchTankComponent) {
                lunchTankComponent.resetTank();
            }
        });
    });
};

TraduBoss4.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

TraduBoss4.prototype.leapAtTarget = function(targetObject, cb) {
    var othis = this;
    var targetpos = othis.monster.findPointNearObject(targetObject, othis.monster.trackingDistance - 0.25);
    if(targetpos) {
        othis.monster.triggerAnimation("jumpattack");
        setTimeout(function() {
            if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
            console.log("FINISH LEAP!");
            console.log(targetpos);
            othis.gameObject.transform.setNewPosition(targetpos);
            othis.monster.cancelPathfinding();
            othis.monster.snapToGrid();
            othis.monster.timeSinceBasicAttack = 0;
            othis.monster.dealMeleeDamage(targetObject, {dmgAmount: othis.monster.potencyDamage(othis.leapPotency), sender: othis.gameObject.entity, dmgType: "physical", noCrit: true}, 1000);
        }, 250);
        if(cb) cb();
    }
    else {
        console.log("UNABLET TO LEAP TO TARGET!");
        if(cb) cb();
    }
}

TraduBoss4.prototype.feedOnTarget = function(targetTankObj) {
    this.leapAtTarget(targetTankObj);
    this.isFeeding = true;
    this.feedingFor = 0;
}

TraduBoss4.prototype.finishedFeeding = function() {
    console.log("DONE FEEDING!");
    console.log("SECONDS FEEDING: " + this.feedingFor);
    this.isFeeding = false;
    if(this.feedingCallback) {
        this.feedingCallback();
        this.feedingCallback = null;
    }
    if(this.currentTank) {
        this.currentTank.useUp();
        this.currentTank = false;
    }
}

TraduBoss4.prototype.breathAttack = function(finishCallback) {
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

module.exports = TraduBoss4;
