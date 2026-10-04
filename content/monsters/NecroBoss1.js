/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var NecroBoss1 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

NecroBoss1.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: NecroBoss1
});

NecroBoss1.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.setMovementSpeed(7.0);
    
    this.monster.basicAttackEvery = 2.5;
    if(this.gameObject.zone.zoneInfo.raidLevel === "expert") {
        console.log("-------------------!!!!!!!!!!!!!!!!!!USING EXPERT MODE SCALING!");
        this.monster.individualScaling = 3.0;
        this.monster.lootLevel = 21.4;
        this.monster.lootDungeonName = "necroboss1expert";
        this.breathEvery = 10;
        this.monster.basicAttackPotency = 350; //was 350
        this.monster.lootTier = 9;
    }
    else if(this.gameObject.zone.zoneInfo.raidLevel === "hard") {
        console.log("-------------------!!!!!!!!!!!!!!!!!!USING HARD MODE SCALING!");
        this.monster.individualScaling = 2.0;
        this.monster.lootLevel = 21.2;
        this.monster.lootDungeonName = "necroboss1hard";
        this.breathEvery = 15;
        this.monster.basicAttackPotency = 300; //was 350
        this.monster.lootTier = 9;
    }
    else {
        console.log("----------------------!!!!!!!!!!!!!!!!!!!!!!!USING NORMAL MODE SCALING!");
        this.monster.individualScaling = 1.10;
        this.monster.lootLevel = 20.50;
        this.monster.lootDungeonName = "necroboss1";
        this.breathEvery = 25;
        this.monster.basicAttackPotency = 250; //was 350
        this.monster.lootTier = 8;
    }
    
    setTimeout(function() {
        othis.monster.initStats({baseVitality: 8240 * 7 * 2.0}); //scale up for 10 (instead of 5 players) @ level 20 base, individual scaling will be applied on top of that.
    }, 0);
    this.monster.aggroOnSight = false;
    
    this.monster.bossTrackingName = "necroboss1";

    this.timeSinceChill = 0;
    this.chillEvery = 6;

    this.timeSinceBreath = 0;
    this.breathSize = new Vector3(27, 8, 80);
    this.breathForwardOffset = -0.50; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 2.0;
    this.breathPotency = 1600;

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        if(!othis.monster.trackingTarget) return;

        othis.timeSinceChill += args.delta;
        othis.timeSinceBreath += args.delta;

        if(othis.timeSinceChill > othis.chillEvery) {
            othis.timeSinceChill = 0;
            othis.doTick();
        }

        if(othis.timeSinceBreath > othis.breathEvery) {
            othis.timeSinceBreath = 0;
            othis.breathAttack([new Vector3(315.0, 12.8, 258.992), new Vector3(346.90, 12.8, 247.34)]);
        }
    });

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceTankBuster++;

        if(othis.monster.trackingTarget) {
            var trackingMonster = othis.monster.trackingTarget.getComponent("Monster");
            if(trackingMonster) {
                trackingMonster.refreshStatusEffectsByType(58, 12); //make sure all effects are 12 seconds remaining.
                trackingMonster.addStatusEffect(StatusEffects.Effects.TankSickness, 12, {sourceEntity: othis.gameObject.entity});
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
        //console.log("TraduWorldBoss NO TARGETS!");
        othis.timeSinceBreath = 0;
        othis.timeSinceChill = 0;
        othis.attacksSinceTankBuster = 0;
        othis.monster.movementLock = false;
        //othis.monster.suicide();
    });
}

NecroBoss1.prototype.doTick = function() {
    var othis = this;
    var collisionObjs = othis.gameObject.zone.sphereCast(othis.gameObject.getWorldPosition(), 150);
    _.each(collisionObjs, function(anobj) {
        //console.log("DEEP CHILL FIRE FOUND: " + anobj.orbusCollider.gameObject.name);
        if(!anobj.orbusCollider.gameObject.hasMonster) return;
        if(anobj.orbusCollider.gameObject.layer !== 15) return; //only hurt players.
        if(anobj.orbusCollider.gameObject == othis.gameObject) return; //don't hurt ourselves.
        
        var testMonster = anobj.orbusCollider.gameObject.getComponent("Monster");
        if(testMonster) {
            //console.log("DEEP CHILL FIRE REMOVEING STASTUS EFFECTS!");
            if(!testMonster.isDead) {
                testMonster.addStatusEffect(StatusEffects.Effects.DeepChill, 300, {});
            }
        }
    });
}

// NecroBoss1.prototype.breathAttack = function(thisPosition) {
//     var othis = this;
//     //Center point is where I am, +1 + 1/2 size * forward vector
//     //this.gameObject.transform.setNewPosition(thisPosition[0]);
//     this.monster.turnToward(thisPosition[1]);
//     this.monster.movementLock = true;

//     setTimeout(function() {
//         if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
//         var breathCenter = othis.gameObject.forward().multiplyScalar(othis.breathForwardOffset + othis.breathSize.z * 0.5).add(othis.gameObject.transform.position);
//         breathCenter.y += othis.breathSize.y * 0.5 - 1.0;
//         //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
//         othis.monster.dangerZone("directional", "box", breathCenter, othis.breathSize, othis.breathCastTime, 1, function(objectsHit) {
//             _.each(objectsHit, function(anobj) {
//                 othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
//             });
//             othis.monster.movementLock = false;
//         });
//     }, 500);
// };

NecroBoss1.prototype.breathAttack = function(thisPosition) {
    var othis = this;

    this.monster.turnToward(thisPosition[1]);
    this.monster.movementLock = true;

    setTimeout(function() {
        if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
        //Center point is where I am, +1 + 1/2 size * forward vector
        var breathCenter = othis.gameObject.forward().multiplyScalar(othis.breathForwardOffset).add(othis.gameObject.transform.position);
        breathCenter.y += othis.breathSize.y * 0.5 - 1.0;
        //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
        othis.monster.slingProjectile(breathCenter, othis.gameObject.forward(), othis.breathSize, othis.breathCastTime, 1, function(objectsHit) {
            _.each(objectsHit, function(anobj) {
                othis.monster.dealAoeDamage(anobj, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
            });
            othis.monster.movementLock = false;
        });

    }, 500);
};

NecroBoss1.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 2000);
    cb();
}

module.exports = NecroBoss1;
