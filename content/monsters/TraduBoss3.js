/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var TraduBoss3 = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

TraduBoss3.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: TraduBoss3
});

TraduBoss3.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 9;
    this.monster.setMovementSpeed(7.5);
    this.monster.basicAttackPotency = 350;
    //this.monster.basicAttackPotency = 1;
    this.monster.basicAttackEvery = 2.5;
    this.monster.giveUpChaseAfter = 150;

    this.monster.lootTier = 5;
    this.monster.lootLevel = 20.25;
    this.monster.lootDungeonName = "traduwing4";
    this.monster.bossTrackingName = "traduboss3";

    this.breathEvery = 3;
    this.attacksSinceBreath = 0;
    this.breathSize = new Vector3(6, 8, 40);
    this.breathForwardOffset = 0.50; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 1.5;
    this.breathPotency = 1600;
    this.breathCounter = 0;
    //this.breathPotency = 1;

    this.tankBusterEvery = 3;
    this.attacksSinceTankBuster = 0;
    this.tankBusterPotency = 1200;
    //this.tankBusterPotency = 1;

    this.chaseEvery = 7;
    this.attacksSinceChase = 0;
    this.chaseTarget = null;
    this.isChasing = false;
    this.chasingForSeconds = 0;
    this.stopChasingAfter = 10;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        if(othis.isChasing) return;

        othis.attacksSinceBreath++;
        othis.attacksSinceChase++;
        othis.attacksSinceTankBuster++;

        if(othis.attacksSinceBreath > othis.breathEvery) {
            if(args.takeOpportunity()) {
                othis.attacksSinceBreath = 0;
                othis.breathAttack(args.finishOpportunity);
                return;
            }
        }

        if(othis.attacksSinceChase > othis.chaseEvery) {
            if(args.takeOpportunity()) {
                othis.chooseChaseTarget();
                othis.attacksSinceChase = 0;
                args.finishOpportunity();
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
        if(!othis.isChasing) return;

        othis.chasingForSeconds += args.delta;
        if(othis.chasingForSeconds > othis.stopChasingAfter) {
            console.log("DONE CHASING!");
            othis.isChasing = false;
            othis.monster.aggroLock = false;
            othis.monster.setMovementSpeed(7.5);
        }
    })

    this.gameObject.addEventListener("MonsterNoTargets", function() {
        console.log("TRADUBOSS3 NO TARGETS!");
        othis.isChasing = false;
        othis.monster.aggroLock = false;
        othis.monster.setMovementSpeed(7.5);
    });
};

// TraduBoss3.prototype.breathAttack = function(finishCallback) {
//     var othis = this;
//     this.breathCounter++;
//     if(this.breathCounter % 2 === 0) {
//         //Stay facing current direction
//     }
//     else {
//         var currentTable = this.monster.getSortedAggroTable();
//         if(currentTable.length > 0) {
//             this.monster.turnToward(_.sample(currentTable).targetGo.getWorldPosition());
//             this.gameObject.transform.updateMatrixWorld();
//         }
//     }
//     //Center point is where I am, +1 + 1/2 size * forward vector
//     var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
//     breathCenter.y += this.breathSize.y * 0.5 - 1.0;
//     //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
//     this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
//         console.log("MONSTER DANGER ZONE OBJECTS HIT");
//         console.log(objectsHit.length);
//         _.each(objectsHit, function(anobj) {
//             console.log(anobj.orbusCollider.gameObject.name);
//             othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
//         });
//         finishCallback();
//     });
// };

TraduBoss3.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    this.breathCounter++;
    if(this.breathCounter % 2 === 0) {
        //Stay facing current direction
    }
    else {
        var currentTable = this.monster.getSortedAggroTable();
        if(currentTable.length > 0) {
            this.monster.turnToward(_.sample(currentTable).targetGo.getWorldPosition());
            this.gameObject.transform.updateMatrixWorld();
        }
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

TraduBoss3.prototype.chooseChaseTarget = function() {
    console.log("BEGIN CHASING!");
    var othis = this;
    othis.chasingForSeconds = 0;
    othis.isChasing = true;
    othis.monster.aggroRandomTargetFromTable(othis.monster.potencyDamage(500), true);
    othis.monster.attackTopAggroPlayer();
    othis.monster.aggroLock = true;
    othis.monster.setMovementSpeed(10.0);
}

TraduBoss3.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();
}

module.exports = TraduBoss3;
