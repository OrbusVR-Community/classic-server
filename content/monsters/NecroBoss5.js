/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;
var Chance = require("orbus").Chance;

var NecroBoss5 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroBoss5.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroBoss5
});

NecroBoss5.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.0);
    this.monster.basicAttackEvery = 2;

    if(this.gameObject.zone.zoneInfo.raidLevel === "expert") {
        this.monster.individualScaling = 3.6;
        this.monster.lootLevel = 21.4;
        this.monster.lootDungeonName = "necroboss5expert";
        this.monster.basicAttackPotency = 300;
        this.breathCastTime = 1.25; //was 1.5
        this.spitEvery = 8;
        this.numToTeleport = 2; //was 2
        this.monster.lootTier = 9;
        this.teleportEvery = 20;
        this.teleportIgnoreIndex = 1;
    }
    else if(this.gameObject.zone.zoneInfo.raidLevel === "hard") {
        this.monster.individualScaling = 3.0;
        this.monster.lootLevel = 21.2;
        this.monster.lootDungeonName = "necroboss5hard";
        this.monster.basicAttackPotency = 350;
        this.breathCastTime = 1.5; //was 1.5
        this.spitEvery = 10;
        this.numToTeleport = 2; //was 2
        this.monster.lootTier = 9;
        this.teleportEvery = 25;
        this.teleportIgnoreIndex = 0;
    }
    else {
        this.monster.individualScaling = 1.8;
        this.monster.lootLevel = 20.50;
        this.monster.lootDungeonName = "necroboss5";
        this.monster.basicAttackPotency = 300;
        this.breathCastTime = 2.5; //was 1.5
        this.spitEvery = 15; //was 10
        this.numToTeleport = 1; //was 2
        this.monster.lootTier = 8;
        this.teleportEvery = 35;
        this.teleportIgnoreIndex = 0;
    }

    setTimeout(function() {
        othis.monster.initStats({baseVitality: 8240 * 7 * 2.25 * 0.90, magdefense: 100, defense: 100}); //scale up for 10 (instead of 5 players) @ level 20 base, individual scaling will be applied on top of that.
    }, 0);

    this.monster.bossTrackingName = "necroboss5";

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.breathEvery = 4;
    this.attacksSinceBreath = 0;
    this.breathSize = new Vector3(10, 8, 70);
    this.breathForwardOffset = -0.50; //how far forward to shift the breath from the center of the monster to the front.
    this.breathPotency = 1600;
    this.breathCounter = 0;

    this.timeSinceSpit = 0;

    this.timeSinceTeleport = 0;
    this.teleportPositions = [new Vector3(921.67, 200, 482.88), new Vector3(88, 200, 260.0), new Vector3(99.1, 200, 821.98)];

    this.minionsToDestroy = [];

    this.giveSelfBuffEvery = 15;
    this.timeSinceSelfBuff = 0;

    this.enrageAfter = 60 * 20;
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

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        othis.attacksSinceTankBuster = 0;
        othis.attacksSinceBreath = 0;
        othis.timeSinceSpit = 0;
        othis.timeSinceTeleport = 0;
        othis.timeSinceSelfBuff = 0;
        othis.enrageTimer = 0;
        othis.gameObject.zone.setZoneVar("spawnMini1", false);
        othis.gameObject.zone.setZoneVar("spawnMini2", false);
        othis.gameObject.zone.setZoneVar("spawnMini3", false);
        othis.resetMinions();
    });

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(!othis.monster.trackingTarget) return;

        othis.timeSinceSpit += args.delta;
        othis.timeSinceTeleport += args.delta;
        othis.timeSinceSelfBuff += args.delta;

        if(othis.timeSinceSpit > othis.spitEvery) {
            console.log("WANT TO SPIT!");
            //othis.spit();
            var currentTable = othis.monster.getSortedAggroTable();
            var targetsToCurse = _.sample(currentTable, othis.numToTeleport);
            for(var i=0; i < targetsToCurse.length; i++) {
                othis.curseTarget(targetsToCurse[i].targetGo);
            }
            othis.timeSinceSpit = 0;
        }
        if(othis.timeSinceTeleport > othis.teleportEvery) {
            console.log("=============WANT TO  TELEPORT");
            var currentTable = othis.monster.getSortedAggroTable();
            if(currentTable.length > othis.teleportIgnoreIndex + 1) {
                currentTable.splice(othis.teleportIgnoreIndex, 1); //ignore nth aggro target
            }
            var targetsToTeleport = _.sample(currentTable, othis.numToTeleport);
            console.log(targetsToTeleport.length);
            for(var i=0; i < targetsToTeleport.length; i++) {
                console.log("TELEPORTING " + targetsToTeleport[i].targetGo);
                othis.teleportToChaos(targetsToTeleport[i].targetGo, i);
            }
            setTimeout(function() {
                if(othis && othis.gameObject && othis.gameObject.zone) {
                    othis.gameObject.zone.setZoneVar("spawnMini1", false);
                    othis.gameObject.zone.setZoneVar("spawnMini2", false);
                    othis.gameObject.zone.setZoneVar("spawnMini3", false);
                }
            }, 1500);
            othis.timeSinceTeleport = 0;
        }
        if(othis.timeSinceSelfBuff > othis.giveSelfBuffEvery) {
            othis.timeSinceSelfBuff = 0;
            if(Chance.rollPercentChance(50)) {
                othis.monster.addStatusEffect(StatusEffects.Effects.MagDefBoost, 15, {boostPercent: 100.0});
            }
            else {
                othis.monster.addStatusEffect(StatusEffects.Effects.PhysDefBoost, 15, {boostPercent: 100.0});
            }
        }

        othis.enrageTimer += args.delta;
        if(othis.enrageTimer > othis.enrageAfter) {
            othis.monster.addStatusEffect(StatusEffects.Effects.Enraged, 60, {});
        }
    });
};

// NecroBoss5.prototype.breathAttack = function(finishCallback) {
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

NecroBoss5.prototype.breathAttack = function(finishCallback) {
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

NecroBoss5.prototype.spit = function() {

    var othis = this;

    var targetPos = this.gameObject.getWorldPosition().add(this.gameObject.forward().multiplyScalar(3.0));
    console.log(targetPos);

    var newminion = this.gameObject.zone.spawnEntity("DangerPool", targetPos);
    var dangerPoolComponent = newminion.gameObject.getComponent("DangerPool");
    dangerPoolComponent.Setup(4.5, this.monster.potencyDamage(300), this.gameObject.entity);
    dangerPoolComponent.lifeRemaining = 60;
    this.trackMinion(newminion);
}

NecroBoss5.prototype.curseTarget = function(targetGo) {
    var othis = this;
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) return;
    targetMonster.addStatusEffect(StatusEffects.Effects.CursedPool, 6, {blameEntity: othis.gameObject.entity, tickDmg: othis.monster.potencyDamage(600)});
}

NecroBoss5.prototype.teleportToChaos = function(targetGo, slotNum) {
    var othis = this;
    if(!targetGo) {
        console.log("CAN'T TELEPORT< TARGET GO IS FALSE");
        return;
    }
    console.log("spawnMini" + (slotNum + 1));
    //this.gameObject.zone.setZoneVar("spawnMini" + (slotNum + 1), true);
    var pcc = targetGo.getComponent("PlayerCharacterComponent");
    if(!pcc) {
        console.log("CAN'T TELEPORT TARGET, PCC IS FALSE.");
        return;
    }

    //To prevent reseting if we send the tank...
    this.monster.removeEntityFromAggroList(pcc.gameObject.entity, null, true);
    if(this.monster.trackingTarget === targetGo) {
        this.monster.clearTrackingTarget();
    }

    var newminion = this.gameObject.zone.spawnEntity("NecroMiniBoss", new Vector3().add(this.teleportPositions[slotNum]).add(new Vector3(10.0, 0, 10.0)));
    var newmonster = newminion.gameObject.getComponent("Monster");
    var classModifier = 0.80;
    if(pcc.currentClassName == "Archer") {
        classModifier = 0.75; //was 0.90
    }
    else if(pcc.currentClassName == "Runemage") {
        classModifier = 0.65;
    }
    else if(pcc.currentClassName == "Orbhealer" || pcc.currentClassName == "Swordboard") {
        classModifier = 0.15; //was 0.20
    }
    newmonster.individualScaling = Math.min(3.3, this.monster.individualScaling) * classModifier;
    newmonster.xpModifier = 0;
    _.defer(function() {
        newmonster.scaleToLevel(20);
        if(targetGo) {
            //newmonster.addAggroForEntity(targetGo.entity, 100);
        }
    });

    
    console.log("TELEPORTING " + pcc.monster.getSyncedVar("name") + " TO CHAOS TEAR!");
    pcc.movePosition(this.teleportPositions[slotNum], null, true);
    pcc.monster.removeStatusEffectByType(62, 1000);
    
}

NecroBoss5.prototype.trackMinion = function(aminion) {
    var othis = this;
    aminion.gameObject.addEventListener("MonsterDeath", function() {
        othis.minionsToDestroy = _.without(othis.minionsToDestroy, aminion);
    });
    this.minionsToDestroy.push(aminion);
}

NecroBoss5.prototype.resetMinions = function() {
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

NecroBoss5.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical", noCrit: true, maxAttackDistance: 40}, 2000);
    cb();
}

module.exports = NecroBoss5;
