/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss1 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss1.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss1
});

TraduBoss1.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 5;
    this.monster.setMovementSpeed(6.0);
    this.monster.basicAttackPotency = 250;
    //this.monster.basicAttackPotency = 1;
    this.monster.basicAttackEvery = 2;

    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing4";
    this.monster.bossTrackingName = "traduboss1";

    this.breathEvery = 4;
    this.attacksSinceBreath = 0;
    this.breathSize = 12;
    this.breathCastTime = 2.5;
    this.breathPotency = 800;
    //this.breathPotency = 1;

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;
    //this.tankBusterPotency = 1;

    this.currentPhase = 0;
    this.timeSincePhaseSwitch = 0;
    this.switchPhaseEvery = 20;

    this.timeSincePhaseThreeIncrease = 0;
    this.increasePhaseThreeEvery = 2;
    this.timeSincePhaseThreeStarted = 0;
    this.phaseThreeAutoKill = 10;

    this.timeSinceStatusEffectCheck = 0;
    this.checkStatusEffectEvery = 3;

    this.timeSinceTriggerCheck = 0;
    this.checkTriggerEvery = 1;

    this.monster._noSickness = true;

    this.addSyncedVar(1, "currentPhase", "int", 0);

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
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

        othis.timeSinceStatusEffectCheck += args.delta;

        if(othis.timeSinceStatusEffectCheck > othis.checkStatusEffectEvery) {
            othis.timeSinceStatusEffectCheck = 0;
            othis.applyStatusEffect();
        }

        othis.timeSinceTriggerCheck += args.delta;
        if(othis.timeSinceTriggerCheck > othis.checkTriggerEvery) {
            othis.timeSinceTriggerCheck = 0;
            othis.triggerCheck();
        }

        if(othis.currentPhase == 3) {
            othis.timeSincePhaseThreeIncrease += args.delta;
            othis.timeSincePhaseThreeStarted += args.delta;
            if(othis.timeSincePhaseThreeStarted > othis.phaseThreeAutoKill) {
                //console.log("PHASE THREE AUTO KILL");
                othis.monster.basicAttackPotency = 2000;
            }
            if(othis.timeSincePhaseThreeIncrease > othis.increasePhaseThreeEvery) {
                othis.timeSincePhaseThreeIncrease = 0;
                othis.monster.basicAttackPotency += 150;
            }
        }
        else {
            othis.timeSincePhaseSwitch += args.delta;
            if(othis.timeSincePhaseSwitch > othis.switchPhaseEvery) {
                othis.timeSincePhaseSwitch = 0;
                othis.currentPhase++;
                othis.startNewPhase();
            }
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function(args) {
        console.log("TRADU BOSS 1 NO TARGETS!");
        othis.currentPhase = 0;
        othis.setSyncedVar("currentPhase", othis.currentPhase, true);
        othis.timeSincePhaseSwitch = 0;
        othis.timeSinceStatusEffectCheck = 0;
        othis.monster.basicAttackEvery = 2;
        othis.monster.basicAttackPotency = 250;
        othis.monster.setMovementSpeed(6.0);
        othis.timeSincePhaseThreeStarted = 0;
    });
};

TraduBoss1.prototype.triggerCheck = function() {
    //So basically, check to see if all 3 of our 'buttons' have been hit. If they have, go to the next phase.
    var buttonsActivated = 0;
    var foundButtons = [];
    var othis = this;
    _.each(this.monster.nearbyMonsters(200, 11), function(targetMonster) {
        if(targetMonster.gameObject.getComponent("TraduButton") !== null) {
            foundButtons.push(targetMonster.gameObject.getComponent("TraduButton"));
        }
    });

    if(foundButtons.length < 3) {
        console.log("ERROR: ONLY FOUND " + foundButtons.length + " TRADU BUTTONS!");
    }

    _.each(foundButtons, function(aButton) {
        if(aButton.getSyncedVar("activated") === true) {
            buttonsActivated++;
        }
        //aButton.setSyncedVar("activated", false);
    });

    if(buttonsActivated === 3) {
        if(othis.currentPhase == 3) {
            console.log("ALL BUTTONS ACTIVATED DURING PHASE THREE!");
            this.currentPhase = 1;
            this.startNewPhase();
        }
    }
}

TraduBoss1.prototype.startNewPhase = function() {
    if(this.currentPhase > 3) {
        this.currentPhase = 1;
    }

    console.log("STARTING PHASE: " + this.currentPhase);

    if(this.currentPhase == 3) {
        console.log("ENRAGED");
        this.monster.basicAttackEvery = 1.5;
        this.monster.basicAttackPotency = 350;
        this.monster.setMovementSpeed(8.0);
        this.timeSincePhaseThreeIncrease = 0;
        this.timeSincePhaseThreeStarted = 0;
    }
    else {
        console.log("UN-ENRAGED");
        this.monster.basicAttackEvery = 2;
        this.monster.basicAttackPotency = 250;
        this.monster.setMovementSpeed(6.0);
    }

    this.setSyncedVar("currentPhase", this.currentPhase, true);
}

TraduBoss1.prototype.applyStatusEffect = function() {
    if(this.currentPhase == 3 || this.currentPhase === 0) return;
    console.log("APPLY STATUS EFFECTS GLOBALLY FOR PHASE: " + this.currentPhase);
    var nearby = this.monster.nearbyMonsters(100, 15, true);
    var othis = this;
    var effectType = StatusEffects.Effects.HurtNearby;
    if(this.currentPhase == 2) {
        effectType = StatusEffects.Effects.HurtAlone;
    }
    _.each(nearby, function(targetMonster) {
        targetMonster.addStatusEffect(effectType, othis.checkStatusEffectEvery, {tickDmg: othis.monster.potencyDamage(30), sourceEntity: othis.gameObject.entity});
    });
}

TraduBoss1.prototype.breathAttack = function(finishCallback) {
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

TraduBoss1.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

module.exports = TraduBoss1;
