/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var NecroBoss3 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroBoss3.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroBoss3
});

NecroBoss3.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackEvery = 2.5;

    if(this.gameObject.zone.zoneInfo.raidLevel === "expert") {
        this.monster.individualScaling = 3.4;
        this.monster.lootLevel = 21.4;
        this.monster.lootDungeonName = "necroboss3expert";
        this.monster.basicAttackPotency = 350;
        this.changePhasesEvery = 20;
        this.breathCastTime = 3.0;
        this.leapPotency = 800;
        this.spitEvery = 8;
        this.monster.lootTier = 9;
        this.leapDelay = 150;

    }
    else if(this.gameObject.zone.zoneInfo.raidLevel === "hard") {
        this.monster.individualScaling = 2.4;
        this.monster.lootLevel = 21.2;
        this.monster.lootDungeonName = "necroboss3hard";
        this.monster.basicAttackPotency = 350;
        this.changePhasesEvery = 30;
        this.breathCastTime = 4.0;
        this.leapPotency = 800;
        this.spitEvery = 10;
        this.monster.lootTier = 9;
        this.leapDelay = 500;

    }
    else {
        this.monster.individualScaling = 1.4;
        this.monster.lootLevel = 20.50;
        this.monster.lootDungeonName = "necroboss3";
        this.monster.basicAttackPotency = 250; //was 350
        this.changePhasesEvery = 35; //was 30
        this.breathCastTime = 5.0; //was 4.0
        this.leapPotency = 450; //was 750
        this.spitEvery = 15; //was 10
        this.monster.lootTier = 8;
        this.leapDelay = 500;
    }

    setTimeout(function() {
        othis.monster.initStats({baseVitality: 8240 * 7 * 2.0 * 0.90}); //scale up for 10 (instead of 5 players) @ level 20 base, individual scaling will be applied on top of that.
    }, 0);
    this.monster.giveUpChaseAfter = 80;
    //this.monster.aggroOnSight = false;

    this.monster.bossTrackingName = "necroboss3";

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.phase1BoxCenter = new Vector3(515.02, 12.8, 527.34);
    this.phase1Box = new Vector3(200.0, 2.50, 150.0);
    this.phase2BoxCenter = new Vector3(515.02, 16.50, 527.34);
    this.phase2Box = new Vector3(200.0, 2.50, 150.0);
    this.currentPhase = 1;
    this.timeSincePhaseChange = 0;
    this.breathPotency = 1600;

    this.soulsuckRadius = 8;
    this.soulsuckCastTime = 2;
    this.soulsuckPotency = 1600;

    this.minionsToDestroy = [];

    this.timeSinceSpit = 0;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceTankBuster++;

        if(othis.monster.trackingTarget) {
            var trackingMonster = othis.monster.trackingTarget.getComponent("Monster");
            if(trackingMonster) {
                var tankSicknessDuration = 12;
                if(othis.gameObject.zone.zoneInfo.raidLevel === "expert") {
                    tankSicknessDuration = 20;
                }
                trackingMonster.refreshStatusEffectsByType(58, tankSicknessDuration); //make sure all effects are 12 seconds remaining.
                trackingMonster.addStatusEffect(StatusEffects.Effects.TankSickness, tankSicknessDuration, {sourceEntity: othis.gameObject.entity});
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

        othis.timeSincePhaseChange += args.delta;
        if(othis.timeSincePhaseChange > othis.changePhasesEvery) {
            othis.timeSincePhaseChange = 0;
            othis.doPhaseBox();
            othis.currentPhase++;
            if(othis.currentPhase > 2) {
                othis.currentPhase = 1;
            }
        }

        othis.timeSinceSpit += args.delta;
        if(othis.timeSinceSpit > othis.spitEvery) {
            console.log("WANT TO SPIT!");
            othis.spit();
            othis.timeSinceSpit = 0;
        }

    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("NecroBoss3 NO TARGETS!");
        othis.attacksSinceTankBuster = 0;
        othis.currentPhase = 1;
        othis.timeSincePhaseChange = 0;
        othis.monster.movementLock = false;
        othis.timeSinceSpit = 0;
        othis.resetMinions();
    });
}

NecroBoss3.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 2000);
    cb();
}

NecroBoss3.prototype.doPhaseBox = function() {
    var othis = this;
    this.monster.movementLock = true;
    if(this.currentPhase == 1) {
        var breathCenter = this.phase1BoxCenter;
        var breathSize = this.phase1Box;
    }
    else {
        var breathCenter = this.phase2BoxCenter;
        var breathSize = this.phase2Box;
    }
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        othis.monster.triggerAnimation("leap");
        var targetGameObject = othis.monster.getRandomTargetFromTable(true);
        if(targetGameObject) {
            othis.leapAtTarget(targetGameObject.targetGo);
        }
    });
    
}

NecroBoss3.prototype.leapAtTarget = function(targetObject, cb) {
    var othis = this;
    var targetpos = othis.monster.findPointNearObject(targetObject, 0.5);
    if(targetpos) {
        othis.monster.triggerAnimation("jumpattack");
        othis.monster.turnToward(targetpos);
        setTimeout(function() {
            if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
            console.log("FINISH LEAP!");
            console.log(targetpos);
            othis.gameObject.transform.setNewPosition(targetpos);
            othis.gameObject.transform.updateMatrixWorld();
            othis.monster.cancelPathfinding();
            othis.monster.snapToGrid();
            othis.monster.timeSinceBasicAttack = 0;
            othis.attacksSinceTankBuster = 0;
            othis.timeSinceSpit = 0;
            setTimeout(function() {
                if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
                //Do massive damage, spread out amount targets in a short distance.
                var nearbyCreatures = othis.gameObject.zone.sphereCast(targetpos, 8);
                var nearbyMonsters = [];
                var numFoundCreatures = 0;
                _.each(nearbyCreatures, function(creature) {
                    console.log("CONSIDER " + creature.orbusCollider.gameObject.name);
                    if(creature.orbusCollider.gameObject.layer === 15) {
                        var testMonster = creature.orbusCollider.gameObject.getComponent("Monster");
                        if(testMonster && !testMonster.isDead) {
                            nearbyMonsters.push(testMonster);
                            numFoundCreatures++;
                            if(creature.orbusCollider.gameObject.name === "OrbhealerTurret") {
                                numFoundCreatures++; //count turrets as two
                                numFoundCreatures++; //count turrets as three.
                            }
                        }
                    }
                });
                console.log("FOUND " + numFoundCreatures + " PLAYERS AT LEAP SPOT!");
                var damagePerPlayer = (othis.monster.potencyDamage(othis.leapPotency, "physical") * 8) / numFoundCreatures; //we want 10 players stacked on top here.
                _.each(nearbyMonsters, function(aMonster) {
                    othis.monster.dealAoeDamage(aMonster.gameObject, {dmgAmount: damagePerPlayer, sender: othis.gameObject.entity, dmgType: "physical"});
                });
                console.log("PER PLAYER DAMAGE: " + damagePerPlayer);
                othis.soulSuck(cb);
            }, othis.leapDelay);
        }, othis.leapDelay);
    }
    else {
        console.log("UNABLET TO LEAP TO TARGET!");
        if(cb) cb();
    }
}

NecroBoss3.prototype.soulSuck = function(finishCallback) {
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
            othis.monster.movementLock = false;
            if(finishCallback) finishCallback();
        }, 1000); //give time for breath animation to finish before we make our next move.
    });
};

NecroBoss3.prototype.spit = function() {

    var othis = this;

    var targetPos = this.gameObject.getWorldPosition().add(this.gameObject.forward().multiplyScalar(3.0));
    console.log(targetPos);

    var newminion = this.gameObject.zone.spawnEntity("DangerPool", targetPos);
    var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
    dangerPoolComponent.Setup(4.5, this.monster.potencyDamage(300), this.gameObject.entity);
    dangerPoolComponent.lifeRemaining = 60;
    this.trackMinion(newminion);
}

NecroBoss3.prototype.trackMinion = function(aminion) {
    var othis = this;
    aminion.gameObject.addEventListener("MonsterDeath", function() {
        othis.minionsToDestroy = _.without(othis.minionsToDestroy, aminion);
    });
    this.minionsToDestroy.push(aminion);
}

NecroBoss3.prototype.resetMinions = function() {
    var othis = this;
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
};

module.exports = NecroBoss3;
