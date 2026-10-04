/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduWorldBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduWorldBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduWorldBoss
});

TraduWorldBoss.prototype.Start = function() {
    var othis = this;

    this.gameObject.zone.setZoneVar("fragmentone", false);
    this.gameObject.zone.setZoneVar("fragmenttwo", false);
    this.gameObject.zone.setZoneVar("fragmentthree", false);
    this.gameObject.zone.setZoneVar("fragmentfour", false);

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackPotency = 350;
    setTimeout(function() {
        othis.monster.initStats({baseVitality: 8564 * 8 * 1.5});
    }, 0);
    this.monster.giveUpChaseAfter = 130;
    this.monster.aggroOnSight = false;
    //this.monster.basicAttackPotency = 1;

    this.monster.basicAttackEvery = 2.5;
    this.monster.isWorldBoss = true;
    this.monster.bossTrackingName = "traduworldboss";

    this.tankBusterEvery = 4;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;
    //this.tankBusterPotency = 1;

    this.leapEvery = 20;
    this.timeSinceLeap = 0;
    this.leapPotency = 400;

    this.spitEvery = 10;
    this.timeSinceSpit = 1;

    this.grievousWoundEvery = 30;
    this.timeSinceGrievousWound = 0;

    this.soulsuckRadius = 8;
    this.soulsuckCastTime = 2;
    this.soulsuckPotency = 1000;

    this.minionsToDestroy = [];

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceTankBuster++;

        if(othis.attacksSinceTankBuster > othis.tankBusterEvery) {
            if(args.takeOpportunity()) {
                othis.tankBuster(args.finishOpportunity);
                othis.attacksSinceTankBuster = 0;
                return;
            }
        }

        if(othis.monster.trackingTarget) {
            var trackingMonster = othis.monster.trackingTarget.getComponent("Monster");
            if(trackingMonster) {
                trackingMonster.refreshStatusEffectsByType(58, 12); //make sure all effects are 12 seconds remaining.
                trackingMonster.addStatusEffect(StatusEffects.Effects.TankSickness, 12, {sourceEntity: othis.gameObject.entity});
            }
        }
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(!othis.monster.trackingTarget) return;

        var pctHealth = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");

        if(pctHealth < 0.95) {
            othis.timeSinceLeap += args.delta;
        }
        othis.timeSinceSpit += args.delta;
        if(pctHealth < 0.85) {
            othis.timeSinceGrievousWound += args.delta;
        }

        if(othis.timeSinceSpit > othis.spitEvery) {
            console.log("WANT TO SPIT!");
            othis.spit();
            othis.timeSinceSpit = 0;
        }

        if(othis.timeSinceLeap > othis.leapEvery) {
            console.log("WANT TO LEAP!");
            var myPosition = othis.gameObject.getWorldPosition();
            //Get all players who are farther than 5 meters from me (to hopefully avoid hitting tanks)
            var nearbyMonsters = _.filter(othis.monster.nearbyMonsters(70, 15), function(aMonster) {
                return aMonster.isPlayer && aMonster.gameObject.getWorldPosition().distanceTo(myPosition) > 5;
            });
            var leapTargetObject;
            if(nearbyMonsters.length > 0) {
                leapTargetObject = _.sample(nearbyMonsters).gameObject;
                othis.leapAtTarget(leapTargetObject);
                othis.monster.movementLock = true;
            }

            othis.timeSinceLeap = 0;
            
        }

        if(othis.timeSinceGrievousWound > othis.grievousWoundEvery) {
            console.log("WANT TO WOUND!");
            othis.grievousWound();
            othis.timeSinceGrievousWound = 0;
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        //console.log("TraduWorldBoss NO TARGETS!");
        othis.timeSinceLeap = 0;
        othis.attacksSinceTankBuster = 0;
        othis.timeSinceSpit = 1;
        othis.resetMinions();
        othis.monster.movementLock = false;
        //othis.monster.suicide();
    });

    this.gameObject.addEventListener("MonsterDeath", function() {
        othis.resetMinions();
    });
};

TraduWorldBoss.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 2000);
    cb();
}

TraduWorldBoss.prototype.soulSuck = function(finishCallback) {
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

TraduWorldBoss.prototype.leapAtTarget = function(targetObject, cb) {
    var othis = this;
    var targetpos = othis.monster.findPointNearObject(targetObject, 0.5);
    if(targetpos) {
        othis.monster.triggerAnimation("jumpattack");
        setTimeout(function() {
            if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
            console.log("FINISH LEAP!");
            console.log(targetpos);
            othis.gameObject.transform.setNewPosition(targetpos);
            othis.gameObject.transform.updateMatrixWorld();
            othis.monster.cancelPathfinding();
            othis.monster.snapToGrid();
            othis.monster.timeSinceBasicAttack = 0;
            setTimeout(function() {
                if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
                //Do massive damage, spread out amount targets in a short distance.
                var nearbyCreatures = othis.gameObject.zone.sphereCast(targetpos, 8);
                var nearbyMonsters = [];
                _.each(nearbyCreatures, function(creature) {
                    console.log("CONSIDER " + creature.orbusCollider.gameObject.name);
                    if(creature.orbusCollider.gameObject.layer === 15) {
                        var testMonster = creature.orbusCollider.gameObject.getComponent("Monster");
                        if(testMonster && !testMonster.isDead) {
                            nearbyMonsters.push(testMonster);
                        }
                    }
                });
                console.log("FOUND " + nearbyMonsters.length + " PLAYERS AT LEAP SPOT!");
                var damagePerPlayer = (othis.monster.potencyDamage(othis.leapPotency, "physical") * 15) / nearbyMonsters.length; //we want 10 players stacked on top here.
                _.each(nearbyMonsters, function(aMonster) {
                    othis.monster.dealAoeDamage(aMonster.gameObject, {dmgAmount: damagePerPlayer, sender: othis.gameObject.entity, dmgType: "physical"});
                });
                console.log("PER PLAYER DAMAGE: " + damagePerPlayer);
                othis.soulSuck(cb);
            }, 500);
        }, 500);
    }
    else {
        console.log("UNABLET TO LEAP TO TARGET!");
        if(cb) cb();
    }
}

TraduWorldBoss.prototype.spit = function() {

    var othis = this;

    var targetPos = this.gameObject.getWorldPosition().add(this.gameObject.forward().multiplyScalar(3.0));
    console.log(targetPos);

    var newminion = this.gameObject.zone.spawnEntity("DangerPool", targetPos);
    var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
    dangerPoolComponent.Setup(4.5, this.monster.potencyDamage(300), this.gameObject.entity);
    dangerPoolComponent.lifeRemaining = 60;
    this.trackMinion(newminion);
}

TraduWorldBoss.prototype.trackMinion = function(aminion) {
    var othis = this;
    aminion.gameObject.addEventListener("MonsterDeath", function() {
        othis.minionsToDestroy = _.without(othis.minionsToDestroy, aminion);
    });
    this.minionsToDestroy.push(aminion);
}

TraduWorldBoss.prototype.resetMinions = function() {
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

TraduWorldBoss.prototype.grievousWound = function() {
    console.log("DOING GRIEVOUS WOUND!");
    var othis = this;
    othis.monster.triggerAnimation("summon");
    var nearbyMonsters = _.filter(othis.monster.nearbyMonsters(150, 15), function(aMonster) {
        console.log(aMonster.gameObject.name);
        console.log(aMonster.isPlayer);
        return aMonster.isPlayer;
    });
    var totalNumberToWound = Math.max(4, nearbyMonsters.length * 0.30); //minimum of 4 people/all present
    console.log("NUMBER TO WOUND: " + totalNumberToWound);
    var monstersToWound = _.sample(nearbyMonsters, Math.ceil(totalNumberToWound));
    console.log("DOING GRIEVOUS WOUND ON " + monstersToWound.length + " MONSTERS");
    _.each(monstersToWound, function(aMonster) {
        console.log("ADDING GRIEVOUS WOUND ON " + aMonster.gameObject.name);
        othis.monster.dealAoeDamage(aMonster.gameObject, {dmgAmount: Math.ceil(aMonster.getSyncedVar("maxHitPoints") * 0.30), sender: othis.gameObject.entity, dmgType: "magical"});
        aMonster.addStatusEffect(StatusEffects.Effects.GrievousWound, 10, {blameEntity: othis.gameObject.entity, tickDmg: othis.monster.potencyDamage(150, "magical")});
    })
}


module.exports = TraduWorldBoss;
