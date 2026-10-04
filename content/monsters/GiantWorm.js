/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var GiantWorm = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

GiantWorm.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: GiantWorm
});

GiantWorm.prototype.Start = function() {
    var othis = this;

    this.movesSincePhaseChange = 0;
    this.currentPhase = 1;
    this.prevPhase = 0;

    this.movesInPhase = {
        1: 5,
        2: 5,
        3: 1
    }

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.basicAttackEvery = 3;
    this.monster.basicAttackPotency = 400;
    this.monster.trackingDistance = 16;
    this.monster.setMovementSpeed(0);
    this.monster.giveUpChaseAfter = 100;
    this.monster.roamDistance = 0;
    this.monster.initStats({baseVitality: 6500 * 7 * 2});
    this.monster.isWorldBoss = true;
    this.monster.bossTrackingName = "sanyael";
    
    this.basicAttackPotency = 500;

    this.timeSinceSpawn = 0;
    this.spawnEvery = 2;
    this.numSpawned = 0;
    this.maxSpawn = 5;

    this.spawnedMinions = [];

    this.timeUnderground = 0;
    this.maxTimeUnderground = 2;

    this.gasEveryAttacks = 3;
    this.attacksSinceGas = 0;

    this.timeUndegroundSinceChasing = 0;
    this.attackFromUndergroundEvery = 4;

    this.poisonPotency = 250;
    this.poisonDuration = 13;

    this.addSyncedVar(1, "aboveGround", "bool", false);
    this.addSyncedVar(2, "spawning", "bool", false);

    setTimeout(function() {
        othis.setSyncedVar("aboveGround", true);
        othis.beginPhase(1);
    }, 2500);

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(othis.monster.trackingTarget) {
            //Check to make sure they're not too far away from us.
            var mypos = othis.gameObject.getWorldPosition();
            var targetpos = othis.monster.trackingTarget.getWorldPosition();
            var distToTarget = mypos.distanceTo(targetpos);

            if(othis.currentPhase !== 0 && othis.currentPhase !== 2 && distToTarget > othis.monster.trackingDistance - 1) {
                console.log("Chasing target");
                othis.prevPhase = othis.currentPhase;
                othis.startedChasingPosition = mypos;
                othis.timeUndegroundSinceChasing = 0;
                othis.beginPhase(0);
                return;
            }
            // else if(othis.currentPhase == 0 && distToTarget < othis.monster.trackingDistance - 1) {
            //     console.log("Re-engaging target");
            //     othis.beginPhase(1);
            // }
        }
        else {
            return;
        }

        if(othis.currentPhase == 0) {
            othis.timeUndegroundSinceChasing += args.delta;
            if(othis.timeUndegroundSinceChasing > othis.attackFromUndergroundEvery && !othis.isAppearing) {
                var targetpos = othis.monster.trackingTarget.getWorldPosition();
                targetpos.add(othis.monster.trackingTarget.forward().normalize().multiplyScalar(4));
                othis.gameObject.transform.setNewPosition(targetpos);
                othis.monster.navagent.snapToGrid();
                othis.timeUndegroundSinceChasing = 0;
                othis.isAppearing = true;
                othis.monster.dangerZone("zone", "sphere", othis.gameObject.zone.snapToGround(targetpos), 8, 1, 3, function(collisionObjs) {
                    var soulsuckDamage = othis.monster.potencyDamage(othis.basicAttackPotency * 5);
                    var targetsHit = 0;
                    _.each(collisionObjs, function(anobj) {
                        othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "physical"});
                    });
                });
                setTimeout(function() {
                    console.log("Re-engaging target");
                    othis.isAppearing = false;
                    othis.beginPhase(1);
                }, 2500);
            }
        }
        else if(othis.currentPhase == 2) {
            othis.timeSinceSpawn += args.delta;
            if(othis.numSpawned > othis.maxSpawn) {
                othis.beginPhase(3);
                return;
            }

            if(othis.timeSinceSpawn > othis.spawnEvery) {
                console.log("SPAWNING!");
                othis.spawnMinion();
                othis.timeSinceSpawn = 0;
                othis.numSpawned++;
                othis.monster.triggerAnimation("spawn");
            }
        }
        else if(othis.currentPhase == 3) {
            othis.timeUnderground += args.delta;
            if(othis.timeUnderground > othis.maxTimeUnderground) {
                othis.beginPhase(1);
            }
        }
    })

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.movesSincePhaseChange++;

        //Handle phase change if needed.
        console.log("GREAT WORM MOVE OPPORTUNITY, PHASE " + othis.currentPhase + " MOVE " + othis.movesSincePhaseChange);

        if(othis.movesSincePhaseChange > othis.movesInPhase[othis.currentPhase]) {
            othis.beginPhase(othis.currentPhase+1);
            othis.movesSincePhaseChange = 0;
        }

        if(othis.currentPhase == 1) {
            //Phase 1 logic
            //Basic attacks.
            othis.attacksSinceGas++;
            args.takeOpportunity();
            if(othis.attacksSinceGas > othis.gasEveryAttacks) {
                othis.attacksSinceGas = 0;

                othis.monster.dangerZone("directional", "sphere", othis.gameObject.forward().normalize().multiplyScalar(10).add(othis.gameObject.transform.position), 50, 2, 2, function(collisionObjs) {
                    var soulsuckDamage = othis.monster.potencyDamage(othis.basicAttackPotency);
                    var targetsHit = 0;
                    _.each(collisionObjs, function(anobj) {
                        var targetMonster = anobj.orbusCollider.gameObject.getComponent("Monster");
                        if(targetMonster) {
                            targetMonster.addStatusEffect(StatusEffects.Effects.Poison, othis.poisonDuration, {tickDmg: othis.monster.potencyDamage(othis.poisonPotency), sourceEntity: othis.gameObject.entity});
                        }
                        othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "magical"});
                    });
                    setTimeout(function() {
                        args.finishOpportunity();
                    }, 2000); //give time for breath animation to finish before we make our next move.
                });
            }
            else if(othis.monster.trackingTarget) {

                var impactPos = othis.gameObject.zone.snapToGround(othis.monster.trackingTarget.getWorldPosition());
                othis.monster.dangerZone("directional", "sphere", impactPos, 8, 1, 1, function(collisionObjs) {
                    var soulsuckDamage = othis.monster.potencyDamage(othis.basicAttackPotency * 2);
                    var targetsHit = 0;
                    _.each(collisionObjs, function(anobj) {
                        othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "physical"});
                    });
                    setTimeout(function() {
                        args.finishOpportunity();
                    }, 100); //give time for breath animation to finish before we make our next move.
                });

            }
        }
        else if(othis.currentPhase == 2) {
            //Phase 2 logic
            //Spawn babies.
            args.takeOpportunity();
            args.finishOpportunity();
        }
        else if(othis.currentPhase == 3) {
            //We are underground, do nothing this phase.
            args.takeOpportunity();
            args.finishOpportunity();
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        //othis.timeSinceMinionSpawn = othis.minionSpawnEvery;
        //othis.monster.resetStatus();
        _.each(othis.spawnedMinions, function(aminion) {
            if(!aminion.isDead) {
                aminion.suicide();
            }
        });
        othis.spawnedMinions = [];
        //othis.broadcastToActiveClients(1, ["byte"], [4]);
        //othis.setSyncedVar("aboveGround", false);
        othis.monster.suicide();
    });
}

GiantWorm.prototype.numNearby = function() {
    var nearbyMonsters = this.monster.nearbyMonsters(200, 15);
    return nearbyMonsters.length;
}

GiantWorm.prototype.spawnMinion = function() {
    var othis = this;
    var newminion = this.gameObject.zone.spawnEntity("Sandworm", this.gameObject.getWorldPosition().add(this.gameObject.forward().normalize().multiplyScalar(5)));
    var newmonster = newminion.gameObject.getComponent("Monster");
    newmonster.scaleToLevel(othis.monster.getSyncedVar("willLevel"));
    var nearbyMonsters = this.monster.nearbyMonsters(200, 15);
    if(nearbyMonsters.length > 0) {
        newmonster.addAggroForEntity(_.sample(nearbyMonsters).gameObject.entity, 100);
        newmonster.xpModifier = 0;
    }
    this.spawnedMinions.push(newmonster);
}

GiantWorm.prototype.beginPhase = function(phaseNum) {
    var othis = this;
    othis.currentPhase = phaseNum;

    console.log("BEGINNING PHASE: " + phaseNum);

    if(othis.currentPhase == 1) {
        othis.setSyncedVar("aboveGround", true);
        othis.setSyncedVar("spawning", false);
        othis.monster.movementLock = false;
        othis.gameObject.layer = 11;
        if(othis.gameObject.collider) {
            othis.gameObject.collider.zoneBody.collisionFilterGroup = 2;
        }
    }
    else if(othis.currentPhase == 2) {
        othis.setSyncedVar("aboveGround", true);
        othis.setSyncedVar("spawning", true);
        othis.monster.movementLock = true;
        othis.numSpawned = 0;
        othis.maxSpawn = Math.max(othis.maxSpawn, Math.ceil(othis.numNearby() * 0.7));
        othis.timeSinceSpawn = -2;
        othis.gameObject.layer = 99;
        if(othis.gameObject.collider) {
            othis.gameObject.collider.zoneBody.collisionFilterGroup = 4;
        }
    }
    else if(othis.currentPhase == 3) {
        othis.setSyncedVar("aboveGround", false);
        othis.setSyncedVar("spawning", false);
        othis.monster.movementLock = true;
        othis.timeUnderground = 0;
    }
    else if(othis.currentPhase == 0) {
        othis.setSyncedVar("aboveGround", false);
        othis.setSyncedVar("spawning", false);
        othis.monster.movementLock = true;
    }
}


module.exports = GiantWorm;
