/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var NecroBoss4 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroBoss4.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroBoss4
});

NecroBoss4.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackEvery = 2;

    if(this.gameObject.zone.zoneInfo.raidLevel === "expert") {
        this.monster.individualScaling = 3.5;
        this.monster.lootLevel = 21.4;
        this.monster.lootDungeonName = "necroboss4expert";
        this.monster.basicAttackPotency = 300;
        this.breathEvery = 3;
        this.breathCastTime = 1.7; //was 1.5
        this.runesmithBoostPct = 1.5;
        this.monster.lootTier = 9;

    }
    else if(this.gameObject.zone.zoneInfo.raidLevel === "hard") {
        this.monster.individualScaling = 2.7;
        this.monster.lootLevel = 21.2;
        this.monster.lootDungeonName = "necroboss4hard";
        this.monster.basicAttackPotency = 300;
        this.breathEvery = 3;
        this.breathCastTime = 1.7; //was 1.5
        this.runesmithBoostPct = 1.0;
        this.monster.lootTier = 9;

    }
    else {
        this.monster.individualScaling = 1.6;
        this.monster.lootLevel = 20.50;
        this.monster.lootDungeonName = "necroboss4";
        this.monster.basicAttackPotency = 200;
        this.breathEvery = 5;
        this.breathCastTime = 2.0; //was 1.5
        this.runesmithBoostPct = 0.35;
        this.monster.lootTier = 8;
    }

    setTimeout(function() {
        othis.monster.initStats({baseVitality: 8240 * 7 * 2.25 * 0.90}); //scale up for 10 (instead of 5 players) @ level 20 base, individual scaling will be applied on top of that.
    }, 0);

    this.monster.bossTrackingName = "necroboss4";
    this.monster.killRecord = "necroboss4";

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.damageTakenSinceLastUpdate = 0;

    this.timeSinceUpdateTwin = 0;
    this.updateTwinEvery = 5;

    
    this.attacksSinceBreath = 0;
    this.breathSize = new Vector3(10, 8, 70);
    this.breathForwardOffset = -0.50; //how far forward to shift the breath from the center of the monster to the front.
    
    this.breathPotency = 1600;
    this.breathCounter = 0;

    this.timeSinceBellPhase = 0;
    this.bellPhaseEvery = 20;
    this.bellPhaseCounter = 0;

    this.enrageAfter = 60 * 20; //was 60 * 15
    this.enrageTimer = 0;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceTankBuster++;
        othis.attacksSinceBreath++;

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

    this.monster.PreAttackCallback = function(dmgAmount, currentHitpoints, attackingMonster) {
        if(attackingMonster && attackingMonster.isPlayer) {
            othis.damageTakenSinceLastUpdate += dmgAmount;
        }
        return dmgAmount;
    }

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        othis.damageTakenSinceLastUpdate = 0;
        othis.attacksSinceTankBuster = 0;
        othis.attacksSinceBreath = 0;
        othis.timeSinceBellPhase = 0;
        othis.bellPhaseCounter = 0;
        othis.timeInCombat = 0;
        othis.enrageTimer = 0;
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(!othis.monster.trackingTarget) return;

        othis.timeInCombat += args.delta;
        othis.timeSinceUpdateTwin += args.delta;
        othis.timeSinceBellPhase += args.delta;
        
        if(othis.timeSinceUpdateTwin > othis.updateTwinEvery) {
            othis.timeSinceUpdateTwin = 0;
            othis.UpdateNearbyTwin();
        }

        if(othis.timeSinceBellPhase > othis.bellPhaseEvery) {
            othis.doBells();
            othis.timeSinceBellPhase = 0;
        }

        othis.enrageTimer += args.delta;
        if(othis.enrageTimer > othis.enrageAfter) {
            othis.monster.addStatusEffect(StatusEffects.Effects.Enraged, 60, {});
        }

    });
};

NecroBoss4.prototype.UpdateNearbyTwin = function() {

    var othis = this;

    var nearbyMonster = this.monster.nearbyMonsters(200, 11, true);
    _.each(nearbyMonster, function(aMonster) {
        if(aMonster.gameObject.getComponent("NecroBoss4") && !aMonster.isDead) {
            console.log("FOUND TWIN TO UPDATE!");
            console.log(othis.damageTakenSinceLastUpdate);
            if(othis.damageTakenSinceLastUpdate > 0) {
                aMonster.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.damageTakenSinceLastUpdate, ignoreAggro: true, dmgType: "physical"});
            }
            if(aMonster.gameObject.getWorldPosition().distanceTo(othis.gameObject.getWorldPosition()) < 20) {
                console.log("BOSSES ARE CLOSE TOGETHER!");
                othis.monster.addStatusEffect(StatusEffects.Effects.RunesmithBoost, 15, {dmgBoostPct: othis.runesmithBoostPct});
            }
            if(aMonster.trackingTarget == null) {
                console.log("TWIN NOT IN COMBAT/NO TRACKING TARGET");
                othis.monster.retreatToHome();
            }
        }
    });

    othis.damageTakenSinceLastUpdate = 0;

};

// NecroBoss4.prototype.breathAttack = function(finishCallback) {
//     var othis = this;
//     var currentTable = this.monster.getSortedAggroTable();
//     if(currentTable.length > 0) {
//         this.monster.turnToward(_.sample(currentTable).targetGo.getWorldPosition());
//         this.gameObject.transform.updateMatrixWorld();
//     }
//     //Center point is where I am, +1 + 1/2 size * forward vector
//     var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
//     breathCenter.y += this.breathSize.y * 0.5 - 1.0;
//     //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
//     this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
//         console.log("MONSTER DANGER ZONE OBJECTS HIT");
//         console.log(objectsHit.length);
//         _.each(objectsHit, function(anobj) {
//             othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
//         });
//         finishCallback();
//     });
// };

NecroBoss4.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    var currentTable = this.monster.getSortedAggroTable();
    if(currentTable.length > 0) {
        this.monster.turnToward(_.sample(currentTable).targetGo.getWorldPosition());
        this.gameObject.transform.updateMatrixWorld();
    }
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.slingProjectile(breathCenter, this.gameObject.forward(), this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        
        finishCallback(); 
    });
};

NecroBoss4.prototype.doBells = function() {

    var nearbyMonster = this.monster.nearbyMonsters(150, 11, true);
    var foundBells = [];
    _.each(nearbyMonster, function(aMonster) {
        if(aMonster.gameObject.getComponent("RaidBell")) {
            console.log("FOUND RAID BELL");
            foundBells.push(aMonster.gameObject.getComponent("RaidBell"));
        }
    });

    if(this.bellPhaseCounter % 2 === 0) {
        //Simon says.
        for(var i=0; i < foundBells.length; i++) {
            (function(bellNum) {
                setTimeout(function() {
                    foundBells[bellNum].RequireHit();
                }, 500 * bellNum);
            })(i);
        }
    }
    else {
        //All at once
        for(var i=0; i < foundBells.length; i++) {
            foundBells[i].RequireHit();
        }
    }

    this.bellPhaseCounter++;
}

NecroBoss4.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical", noCrit: true}, 2000);
    cb();
}

module.exports = NecroBoss4;
