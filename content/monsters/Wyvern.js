/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var Wyvern = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Wyvern.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Wyvern
});

Wyvern.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4;

    this.attacksSinceStatus = 0;
    this.statusEvery = 3;
    this.spitTickPotency = 50;
    this.spitDuration = 13;

    this.breathEvery = 5;
    this.attacksSinceBreath = 0;
    this.breathSize = new Vector3(3, 4, 6);
    this.breathForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 1.5;
    this.breathPotency = 800;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.attacksSinceStatus++;
        othis.attacksSinceBreath++;

        if(othis.attacksSinceBreath > othis.breathEvery) {
            if(args.takeOpportunity()) {
                othis.attacksSinceBreath = 0;
                othis.breathAttack(args.finishOpportunity);
                return;
            }
        }

        if(othis.attacksSinceStatus > othis.statusEvery) {
            if(args.takeOpportunity()) {
                othis.attacksSinceStatus = 0;
                othis.monster.triggerAnimation("poison");
                setTimeout(function() {
                    if(!othis.monster || !othis.gameObject.entity || !othis.monster.trackingTarget) return;

                    othis.poisonTarget(othis.monster.trackingTarget);
                    args.finishOpportunity();
                }, 1000);
            }
        }
    });
};

Wyvern.prototype.poisonTarget = function(targetGo) {
    if(!targetGo) return;
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) {
        console.log("Treid to poison target but had no mosnter attached...");
        return;
    }
    targetMonster.addStatusEffect(StatusEffects.Effects.Burn, this.spitDuration, {tickDmg: this.monster.potencyDamage(this.spitTickPotency), sourceEntity: this.gameObject.entity});
};

Wyvern.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 2, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath attack to finish.
    });
};


module.exports = Wyvern;
