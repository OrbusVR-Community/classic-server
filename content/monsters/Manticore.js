/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var Manticore = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Manticore.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Manticore
});

Manticore.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 3.5;
    this.monster.setMovementSpeed(6.5);

    this.spitTickPotency = 150;
    this.spitDuration = 12;

    this.breathEvery = 4;
    this.attacksSinceBreath = 0;
    this.breathSize = new Vector3(4, 4, 8);
    this.breathForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 1.5;
    this.breathPotency = 200;

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
    });
};

Manticore.prototype.poisonTarget = function(targetGo) {
    if(!targetGo) return;
    var targetMonster = targetGo.getComponent("Monster");
    if(!targetMonster) {
        console.log("Treid to poison target but had no mosnter attached...");
        return;
    }
    targetMonster.addStatusEffect(StatusEffects.Effects.ShadowDot, this.spitDuration, {tickDmg: this.monster.potencyDamage(this.spitTickPotency), sourceEntity: this.gameObject.entity});
};

Manticore.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
            othis.poisonTarget(anobj.orbusCollider.gameObject);
        });
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath attack to finish.
    });
};


module.exports = Manticore;
