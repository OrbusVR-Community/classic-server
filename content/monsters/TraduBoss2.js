/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;
var RaycastResult = require("orbus").cannon.RaycastResult;

var TraduBoss2 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss2.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss2
});

TraduBoss2.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 7;
    this.monster.setMovementSpeed(7.5);
    this.monster.basicAttackPotency = 350;
    this.monster.basicAttackEvery = 2.5;
    this.monster.giveUpChaseAfter = 100;

    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing3";
    this.monster.bossTrackingName = "traduboss2";

    this.breathEvery = 8;
    this.attacksSinceBreath = 0;
    this.breathSize = new Vector3(27, 8, 80);
    this.breathForwardOffset = -0.5; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 2.5;
    this.breathPotency = 1600;
    this.breathCounter = 0;

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;

    this.lineAttackCallback = null;

    this.lineAttackPositions = [
        [new Vector3(743.663,110.763,444.078), new Vector3(717.11,110.763,454.66)],
        [new Vector3(749.087,110.763,450.216), new Vector3(747.422,110.763,451.822)],
        [new Vector3(757.938,110.763,463.84), new Vector3(753.56,110.763,467.63)]
    ];

    this.middlePosition = new Vector3(733.85,110.763,467.24);

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.attacksSinceBreath++;
        othis.attacksSinceTankBuster++;

        if(othis.attacksSinceBreath > othis.breathEvery) {
            if(args.takeOpportunity()) {
                othis.attacksSinceBreath = 0;
                othis.lineAttackCallback = args.finishOpportunity;
                var lineAttackPositionOrder = _.shuffle([0, 1, 2]);
                setTimeout(function() {
                    if(!othis.gameObject || !othis.monster || othis.monster.isDead || !othis.monster.trackingTarget) return;
                    othis.breathAttack(othis.lineAttackPositions[lineAttackPositionOrder[0]]);
                }, 0);
                setTimeout(function() {
                    if(!othis.gameObject || !othis.monster || othis.monster.isDead || !othis.monster.trackingTarget) return;
                    othis.breathAttack(othis.lineAttackPositions[lineAttackPositionOrder[1]]);
                }, 3500);
                setTimeout(function() {
                    if(!othis.gameObject || !othis.monster || othis.monster.isDead || !othis.monster.trackingTarget) return;
                    othis.breathAttack(othis.lineAttackPositions[lineAttackPositionOrder[2]]);
                }, 7000);
                setTimeout(function() {
                    if(!othis.gameObject || !othis.monster || othis.monster.isDead || !othis.monster.trackingTarget) return;
                    othis.waveAttack();
                }, 10500);
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

    });

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("TraduBoss2 NO TARGETS!");
        if(othis.lineAttackCallback) {
            othis.lineAttackCallback();
            othis.lineAttackCallback = null;
        }
        othis.attacksSinceBreath = 0;
    });
};

// TraduBoss2.prototype.breathAttack = function(thisPosition) {
//     var othis = this;
//     //Center point is where I am, +1 + 1/2 size * forward vector
//     this.gameObject.transform.setNewPosition(thisPosition[0]);
//     this.monster.turnToward(thisPosition[1]);

//     var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
//     breathCenter.y += this.breathSize.y * 0.5 - 1.0;
//     //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
//     this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
//         _.each(objectsHit, function(anobj) {
//             othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
//         });
//     });
// };

TraduBoss2.prototype.breathAttack = function(thisPosition) {
    var othis = this;
    this.gameObject.transform.setNewPosition(thisPosition[0]);
    this.monster.turnToward(thisPosition[1]);

    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.slingProjectile(breathCenter, this.gameObject.forward(), this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
    });
};

TraduBoss2.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

TraduBoss2.prototype.waveAttack = function() {
    var othis = this;
    this.gameObject.transform.setNewPosition(this.middlePosition);
    //this.monster.triggerAnimation("waveattack");

    this.spawnBox();

    setTimeout(function() {
        if(!othis.gameObject || !othis.monster || othis.monster.isDead || !othis.monster.trackingTarget) return;
        othis.monster.triggerAnimation("wave");
        var nearbyPlayers = othis.monster.nearbyMonsters(150, 15);
        _.each(nearbyPlayers, function(aMonster) {
            if(!aMonster.isPlayer) return;
            var rayResult = new RaycastResult();
            //console.log(othis.currentBoxObject.collider.zoneBody);
            othis.gameObject.zone.world.raycastObject(othis.currentBoxObject, aMonster.gameObject.getWorldPosition().add(new Vector3(0, 2.0, 0)),  othis.gameObject.getWorldPosition(), {}, rayResult);
            if(rayResult.hasHit) {
                //Collided with box
                console.log("COLLIDED WITH BOX");
            }
            else {
                console.log("NO COLLISION WITH BOX");
                othis.monster.dealAoeDamage(aMonster.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
            }
        });
        if(othis.lineAttackCallback) {
            othis.lineAttackCallback();
            othis.lineAttackCallback = null;
        }
    }, 6000);
}

TraduBoss2.prototype.spawnBox = function() {
    //console.log("SPAWN BOX");
    var othis = this;
    var myworldpos = this.gameObject.transform.position;
    var randomX = Math.random() * 20 - 10;
    if(Math.abs(randomX) < 3.0) {
        randomX = Math.random() * 3 + 3;
    }
    var randomZ = Math.random() * 20 - 10;
    if(Math.abs(randomZ) < 3.0) {
        randomZ = Math.random() * 3 + 3;
    }
    var newent = othis.gameObject.zone.spawnEntity("TraduBox", new Vector3(this.middlePosition.x + randomX, this.middlePosition.y, this.middlePosition.z + randomZ));
    this.currentBoxObject = newent.gameObject;
}

module.exports = TraduBoss2;
