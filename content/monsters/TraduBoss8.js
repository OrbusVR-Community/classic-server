/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss8 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss8.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss8
});

TraduBoss8.prototype.Start = function() {
    var othis = this;

    this.addSyncedVar(1, "fadedOut", "bool", false);

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 7;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackPotency = 350;
    //this.monster.basicAttackPotency = 1;

    this.monster.basicAttackEvery = 2.5;
    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing2";
    this.monster.bossTrackingName = "traduboss8";

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;
    //this.tankBusterPotency = 1;

    this.soulSuckEvery = 5;
    this.attacksSinceSoulSuck = 0;

    this.spawnedMinions = [];
    this.spawnEvery = 7;
    this.timeSinceLastSpawn = 0;

    this.soulsuckRadius = 8;
    this.soulsuckCastTime = 2;
    this.soulsuckPotency = 1000;
    //this.soulsuckPotency = 1;

    this.timeSincePhaseChange = 0;
    this.phaseChangeEvery = 18 + 4 * Math.random();

    this.spawnPoints = [new Vector3(509.85,113.03,513.82), new Vector3(540.07,113.41,565.39), new Vector3(575.93,112.69,540.76)];

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
                othis.soulSuck(args.finishOpportunity);
                othis.attacksSinceSoulSuck = 0;
                return;
            }
        }
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        
        var myHealthPercent = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");

        if(myHealthPercent < 0.80) {
            othis.timeSinceLastSpawn += args.delta;
            if(othis.timeSinceLastSpawn > othis.spawnEvery) {
                othis.timeSinceLastSpawn = 0;
                othis.spawnMinion();
            }
            othis.timeSincePhaseChange += args.delta;
            if(othis.timeSincePhaseChange > othis.phaseChangeEvery) {
                othis.timeSincePhaseChange = 0;
                othis.phaseChangeEvery = 18 + 4 * Math.random();
                if(othis.getSyncedVar("fadedOut")) {
                    var aggroTable = othis.monster.getSortedAggroTable();
                    var targetGameObject = _.sample(aggroTable);
                    othis.teleportBehindTarget(targetGameObject.targetGo);
                    othis.monster.addMaxAggroForEntity(targetGameObject.entity);
                    othis.fadeIn();
                    othis.attacksSinceTankBuster = 2; //do tankbuster not on first move, but second.
                    othis.monster.timeSinceBasicAttack = 0;
                }
                else {
                    othis.fadeOut();
                }
            }
        }
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("TraduBoss8 NO TARGETS!");
        _.each(othis.spawnedMinions, function(aminion) {
            if(!aminion.isDead) {
                aminion.suicide();
            }
        });
        othis.spawnedMinions = [];
        othis.timeSincePhaseChange = 0;
        othis.fadeIn();
    });
};

TraduBoss8.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 2000);
    cb();
}

TraduBoss8.prototype.spawnMinion = function() {
    var minionName = "SmokeMini";
    var minionLevel = 19;
    console.log("SPAWN MINION: " + minionName);
    var othis = this;
    var aggroTable = othis.monster.getSortedAggroTable();
    var targetGameObject = _.sample(aggroTable);
    var newent = othis.gameObject.zone.spawnEntity(minionName, _.sample(othis.spawnPoints));
    var newmonster = newent.gameObject.getComponent("Monster");
    newmonster.xpModifier = 0;
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
        if(targetGameObject) {
            newmonster.addAggroForEntity(targetGameObject.entity, 100);
        }
    });
    this.spawnedMinions.push(newmonster);
}

TraduBoss8.prototype.fadeOut = function() {
    var othis = this;
    this.setSyncedVar("fadedOut", true);
    this.monster.phaseOut();
}

TraduBoss8.prototype.fadeIn = function() {
    this.setSyncedVar("fadedOut", false);
    this.monster.phaseIn();
    //this.gameObject.layer = 11;
}

TraduBoss8.prototype.soulSuck = function(finishCallback) {
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

TraduBoss8.prototype.teleportBehindTarget = function(targetObj) {
    console.log("TELEPORTING BEHIND " + targetObj.name);
    this.monster.cancelPathfinding();
    var forward = (targetObj.entity.head ? targetObj.entity.head.forward() : targetObj.forward());
    var destPos = targetObj.getWorldPosition().sub(forward.normalize().multiplyScalar(2));
    this.gameObject.transform.setNewPosition(destPos);
    this.monster.navagent.snapToGrid();
}

module.exports = TraduBoss8;
