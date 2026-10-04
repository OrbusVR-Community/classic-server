/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var DragonBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

DragonBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: DragonBoss
});

DragonBoss.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.setMovementSpeed(7);
    this.monster.basicAttackPotency = 300;
    this.monster.basicAttackEvery = 2.0;
    this.monster.trackingDistance = 6.0;

    this.timeSinceBreath = 0;
    this.breathEveryAttacks = 4;

    this.breathSize = new Vector3(12, 6, 16);
    this.breathForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 1.5;
    this.breathPotency = 1200;

    this.timeSinceTailSwipe = 0;
    this.tailSwipeEveryAttacks = 3;

    this.tailSize = new Vector3(8, 6, 8);
    this.tailForwardOffset = -7.0; //how far forward to shift the breath from the center of the monster to the front.
    this.tailCastTime = 1.5;
    this.tailPotency = 600;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceBreath += 1;
        othis.timeSinceTailSwipe += 1;

        if(othis.timeSinceBreath > othis.breathEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.breathAttack(args.finishOpportunity);
                othis.timeSinceBreath = 0;
                return;
            }
        }
        else if(othis.timeSinceTailSwipe > othis.tailSwipeEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.tailSwipe(args.finishOpportunity);
                othis.timeSinceTailSwipe = 0;
                return;
            }
        }
    });

    this.gameObject.addEventListener("MonsterDeath", function() {
        othis.gameObject.zone.setZoneVar("qf_dungeon-door-open", true);
    });
}

DragonBoss.prototype.breathAttack = function(finishCallback) {
    console.log("DRAGON BOSS BREATH ATTACK");
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            anobj.orbusCollider.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 500); //give time for breath attack to finish.
        
    });
};

DragonBoss.prototype.tailSwipe = function(finishCallback) {
    console.log("DRAGON BOSS TAIL SWIPE");
    var othis = this;
    var breathCenter = this.gameObject.forward().multiplyScalar(this.tailForwardOffset + this.tailSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.tailSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.tailSize, this.tailCastTime, 2, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            anobj.orbusCollider.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyDamage(othis.tailPotency), sender: othis.gameObject.entity, dmgType: "physical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 500); //give time for breath attack to finish.
        
    });
}

module.exports = DragonBoss;
