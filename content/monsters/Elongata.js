var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var Elongata = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Elongata.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Elongata
});

Elongata.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.basicAttackEvery = 2.5;
    this.monster.basicAttackPotency = 250;
    this.monster.trackingDistance = 12;
    this.monster.setMovementSpeed(0);
    this.monster.giveUpChaseAfter = 100;
    this.monster.roamDistance = 0;
    this.monster.initStats({baseVitality: 6500 * 8 * 2.5});
    this.monster.isWorldBoss = true;
    this.monster.bossTrackingName = "elongata";

    this.timeSinceTankbuster = 0;
    this.tankBusterEvery = 10;
    this.tankBusterPotency = 1200;

    this.timeSinceSeedpod = 0;
    this.seedpodEvery = 3;
    this.seedPodPotency = 800;
    this.seedPodStartPct = 0.75;

    this.minionTypes = "Ghost@19,ForestGolem@20,Ghost@19,Wererabbit@20,Wererabbit@20,Wererabbit@20";
    this.minionSpawnEvery = 45;
    this.timeSinceMinionSpawn = 120; //spawn right away.
    this.minionSpawnPct = 0.65;
    this.spawnedMinions = [];

    this.explodePotency = 1000;
    this.explodeCheckEvery = 4;
    this.timeSinceExplodeCheck = 0;

    this.addSyncedVar(1, "aboveGround", "bool", false);

    setTimeout(function() {
        othis.broadcastToActiveClients(1, ["byte"], [3]);
        othis.setSyncedVar("aboveGround", true);
    }, 2500);

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceTankbuster += args.delta;

        if(othis.monster.trackingTarget && othis.timeSinceTankbuster > othis.tankBusterEvery) {
            othis.tankBuster();
            othis.timeSinceTankbuster = 0;
            args.takeOpportunity();
            setTimeout(function() {
                args.finishOpportunity();
            }, 2000);
        }
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(!othis.monster || !othis.monster.trackingTarget) {
            return;
        }

        othis.timeSinceSeedpod += args.delta;
        othis.timeSinceMinionSpawn += args.delta;
        othis.timeSinceExplodeCheck += args.delta;

        var currentPct = othis.monster.getSyncedVar("hitPoints") / othis.monster.getSyncedVar("maxHitPoints");

        if(currentPct <= othis.seedPodStartPct && othis.timeSinceSeedpod > othis.seedpodEvery) {
            othis.timeSinceSeedpod = 0;
            var aggroTable = othis.monster.getSortedAggroTable();
            othis.spawnPod(aggroTable[aggroTable.length - 1].targetGo); //send pod at lowest aggro target.
        }

        if(currentPct <= othis.minionSpawnPct && othis.timeSinceMinionSpawn > othis.minionSpawnEvery) {
            othis.timeSinceMinionSpawn = 0;
            var aggroTable = othis.monster.getSortedAggroTable();
            var splitminions = othis.minionTypes.split(",");
            _.each(splitminions, function(mtype) {
                var minfo = mtype.split("@");
                othis.spawnMinion(minfo[0], minfo[1], _.sample(aggroTable));
            });
        }

        if(othis.timeSinceExplodeCheck > othis.explodeCheckEvery) {
            othis.timeSinceExplodeCheck = 0;
            if(othis.monster.trackingTarget && othis.monster.trackingTarget.getWorldPosition().distanceTo(othis.gameObject.getWorldPosition()) < 12) {
                //we're good!
            }
            else {
                othis.explode();
            }
            // var monstersInRange = othis.monster.nearbyMonsters(12, 15);
            // if(monstersInRange.length === 0) {
            //     othis.explode();
            // }
        }

        othis.monster.turnToward(othis.monster.trackingTarget.getWorldPosition());
        othis.gameObject.transform.setDirtyRotation();

        
        
    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        //othis.timeSinceMinionSpawn = othis.minionSpawnEvery;
        //othis.monster.resetStatus();
        console.log("ELONGATA NO TARGETS!");
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

Elongata.prototype.tankBuster = function() {
    var othis = this;
    this.broadcastToActiveClients(1, ["byte"], [1]);
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 3000);
}

Elongata.prototype.spawnPod = function(targetGameObject) {
    var othis = this;
    this.broadcastToActiveClients(1, ["byte"], [2]);
    var myworldpos = this.gameObject.transform.position;
    console.log("SEND POD TOWARD " + targetGameObject.name);
    setTimeout(function() {
        if(othis.monster.isDead) return;
        if(!othis.gameObject || !othis.gameObject.zone) return;
        var newmissile = othis.gameObject.zone.spawnEntity("Seedpod", new Vector3(myworldpos.x, myworldpos.y + 9.0, myworldpos.z));
        var podComponent = newmissile.gameObject.getComponent("Seedpod");
        podComponent.firingEntity = othis.gameObject.entity;
        podComponent.trackingTarget = targetGameObject;
        podComponent.dmgAmount = othis.monster.potencyDamage(othis.seedPodPotency);
    }, 500);
    
}

Elongata.prototype.spawnMinion = function(minionName, minionLevel, targetGameObject) {
    var othis = this;
    var randomval = Math.random() * 4;
    var myworldpos = this.gameObject.transform.position;
    var newent = othis.gameObject.zone.spawnEntity(minionName, new Vector3(myworldpos.x + randomval, myworldpos.y, myworldpos.z + randomval));
    var newmonster = newent.gameObject.getComponent("Monster");
    _.defer(function() {
        newmonster.scaleToLevel(parseInt(minionLevel, 10));
        newmonster.addAggroForEntity(targetGameObject.entity, 100);
        newmonster.xpModifier = 0;
    });
    this.spawnedMinions.push(newmonster);
}

Elongata.prototype.explode = function() {
    console.log("ELONGATA EXPLODING");
    var othis = this;
    var monstersInRange = this.monster.nearbyMonsters(100, 15);
    this.broadcastToActiveClients(1, ["byte"], [5]);
    var othis = this;
    setTimeout(function() {
        if(othis.monster.isDead) return;
        _.each(monstersInRange, function(amonster) {
            amonster.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyDamage(othis.explodePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
    }, 1000);
    
}

module.exports = Elongata;