/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var CaveCrawler = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

CaveCrawler.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: CaveCrawler
});

CaveCrawler.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.monster.setMovementSpeed(6.0);
    this.monster.basicAttackPotency = 1;
    this.monster.basicAttackEvery = 1.5;
    this.monster.trackingDistance = 4.5;

    this.timeSinceAggroDrop = 0;
    this.aggroDropEvery = 6;

    this.timeSinceBreath = 0;
    this.breathEveryAttacks = 3;

    this.breathSize = new Vector3(6, 4, 10);
    this.breathForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.breathCastTime = 2.0;
    this.breathPotency = 100;

    this.poisonDuration = 10;
    this.poisonTickPotency = 100;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {
        othis.timeSinceAggroDrop += args.delta;
        if(othis.timeSinceAggroDrop > othis.aggroDropEvery) {
            othis.timeSinceAggroDrop = 0;
            othis.monster.clearAggroList("aggrodrop", true);
        }
    });

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceBreath += 1;

        if(othis.timeSinceBreath > othis.breathEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.breathAttack(args.finishOpportunity);
                othis.timeSinceBreath = 0;
            }
        }
    });
}

CaveCrawler.prototype.breathAttack = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    var breathCenter = this.gameObject.forward().multiplyScalar(this.breathForwardOffset + this.breathSize.z * 0.5).add(this.gameObject.transform.position);
    breathCenter.y += this.breathSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [breathCenter, this.breathSize, this.breathCastTime]);
    this.monster.dangerZone("directional", "box", breathCenter, this.breathSize, this.breathCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            anobj.orbusCollider.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.monster.potencyDamage(othis.breathPotency), sender: othis.gameObject.entity, dmgType: "magical"});
            var targetMonster = anobj.orbusCollider.gameObject.getComponent("Monster");
            if(!targetMonster) return;
            targetMonster.addStatusEffect(StatusEffects.Effects.Poison, othis.poisonDuration, {tickDmg: othis.monster.potencyDamage(othis.poisonTickPotency), sourceEntity: othis.gameObject.entity});
        });
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath attack to finish.
        
    });
};


module.exports = CaveCrawler;
