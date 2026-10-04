/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var OrbBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
    this.orbtype = componentOpts.orbtype;
    console.log("ORB BOSS TYPE: " + this.orbtype);
};

OrbBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: OrbBoss
});

OrbBoss.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    othis.gameObject.zone.setZoneVar("orbBossAlive", true);

    this.monster.setMovementSpeed(6);
    this.monster.basicAttackPotency = 600;
    this.monster.basicAttackEvery = 6.0 + Math.random();
    this.monster.trackingDistance = 12.0;
    setTimeout(function() {
        if(othis.orbtype == "poison" || othis.orbtype == "pool") {
            othis.monster.isBoss = false;
            othis.monster.isElite = true;
            othis.monster._noSpores = true;
            othis.monster._noMutations = true;
            othis.monster.initStats();
        }
    }, 500);

    this.timeSinceWounded = 0;

    this.addSyncedVar(1, "orbByte", "byte", 0);
    this.addSyncedVar(2, "wounded", "bool", false);

    if(this.orbtype == "poison") {
        this.setSyncedVar("orbByte", 1);
    }
    else if(this.orbtype = "pool") {
        this.setSyncedVar("orbByte", 2);
    }

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        if(othis.getSyncedVar("wounded") === true) {
            othis.timeSinceWounded += args.delta;
            if(othis.timeSinceWounded > 30) {
                console.log("REVIVING ME!");
                othis.setSyncedVar("wounded", false);
                othis.monster.setSyncedVar("hitPoints", othis.monster.getSyncedVar("maxHitPoints"));
            }
        }
    });

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        //Take every opportunity we have.
        args.takeOpportunity();
        args.finishOpportunity();

        if(!othis.monster.trackingTarget) return;
        if(othis.getSyncedVar("wounded") == true) return;

        othis.gameObject.zone.setZoneVar("orbBossEngaged", true);

        othis.monster.triggerAnimation("attack");

        //If posion type, then just posion our target.
        if(othis.orbtype === "poison") {
            console.log("POISON TARGET");
            var aggroTable = othis.monster.getSortedAggroTable();
            var chosenTarget = _.sample(aggroTable);
            if(chosenTarget) {
                othis.monster.addMaxAggroForEntity(chosenTarget);
                var targetMonster = chosenTarget.targetGo.getComponent("Monster");
                if(targetMonster) {
                    targetMonster.addStatusEffect(StatusEffects.Effects.Poison, 9, {tickDmg: othis.monster.potencyDamage(100), sourceEntity: othis.gameObject.entity});    
                }
            }
        }
        else if(othis.orbtype === "pool") {
            //Spawn a danger pool on top of our target.
            console.log("SHOOTING POOL");
            if(othis.currentPool) {
                othis.currentPool.gameObject.entity.selfDestruct();
                othis.currentPool = null;
            }
            var targetPcc = othis.monster.trackingTarget.getComponent("PlayerCharacterComponent");
            if(targetPcc) {
                var targetPos = othis.monster.trackingTarget.getWorldPosition();
                targetPos = new Vector3(targetPos.x, targetPcc.playerBase.transform.position.y, targetPos.z);
            }
            else {
                var targetPos = othis.monster.trackingTarget.getWorldPosition();
            }
            
            targetPos = new Vector3(targetPos.x, othis.gameObject.zone.getGroundHeightAt(targetPos.x, targetPos.z), targetPos.z);
            //targetPos = new Vector3(targetPos.x, targetPos.y + 1.0, targetPos.z);
            var newminion = othis.gameObject.zone.spawnEntity("DangerPool", targetPos);
            var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
            othis.currentPool = dangerPoolComponent.Setup(6.0, othis.monster.potencyDamage(75), othis.gameObject.entity);
        }
        else {
            //Just do a basic attack to our target.
            console.log("BASIC ATTACK");
            var dmgAmount = othis.monster.potencyDamage(othis.basicAttackPotency);
            othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1000);
        }
    });

    this.monster.PreAttackCallback = function(dmgAmount, currentHp) {
        //If this much damage would kill us, instead reduce us to 1 HP, set us to wounded, and don't allow further attacks against us to succeed until either we're 
        //all dead, or we resurrect and go back to full health.
        if(othis.getSyncedVar('wounded') == true) {
            return 0; // can't damage us right now.
        }
        else if(currentHp - dmgAmount < 1) {
            othis.setSyncedVar("wounded", true);
            othis.timeSinceWounded = 0;
            othis.checkForAllWounded();
            return (currentHp - 1); //take us to one damage.
        }
        else {
            return dmgAmount; //pass-through
        }
    };

    if(othis.orbtype === "pool") {

        this.gameObject.addEventListener("MonsterNoTargets", function(args) {
            if(othis.currentPool) {
                othis.currentPool.gameObject.entity.selfDestruct();
                othis.currentPool = null;
            }
            othis.gameObject.zone.setZoneVar("orbBossEngaged", false);
        });

        this.gameObject.addEventListener("MonsterDeath", function() {
            if(othis.currentPool) {
                othis.currentPool.gameObject.entity.selfDestruct();
                othis.currentPool = null;
            }
        });

    }
}

OrbBoss.prototype.checkForAllWounded = function() {
    //Okay, get all orb bosses in the area. if all of them are wounded, kill them all.
    var othis = this;
    var allOrbBosses = [];
    var anyOrbBossIsAlive = false;
    var nearbyMonsters = this.monster.nearbyMonsters(200, 11);
    _.each(nearbyMonsters, function(amonster) {
        var thisBoss = amonster.gameObject.getComponent("OrbBoss");
        if(thisBoss) {
            console.log("FOUND A BOSS ON " + amonster.gameObject.name);
            allOrbBosses.push(thisBoss);
            if(thisBoss.getSyncedVar("wounded") === false && amonster !== othis.monster) {
                anyOrbBossIsAlive = true;
            }
        }
    });

    if(anyOrbBossIsAlive) {
        console.log("FOUND AN ALIVE ALLY, DON'T DOO ANYTHING YET!");
        return;
    }
    else {
        console.log("EVERYONE SEEMS DEAD, I'M THE LAST ONE, KILL US ALL!");
        _.each(allOrbBosses, function(aboss) {
            aboss.monster.isDead = true;
            aboss.monster.prepareForDestruction();
            if(othis.gameObject.zone.zoneInfo.isShardDungeon) {
                aboss.monster.isBoss = true;
            }
            
            aboss.monster.triggerAnimation("die");
            aboss.gameObject.entity.selfDestruct(3000);
        });
        othis.gameObject.zone.setZoneVar("orbBossEngaged", false);
        othis.gameObject.zone.setZoneVar("orbBossAlive", false);
    }
}


module.exports = OrbBoss;
