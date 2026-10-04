/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var Seedpod = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);

    this.dmgAmount;
    this.trackingTarget = null;
    this.speed = 10.0;
    this.exploded = false;
    this.firingEntity = null;
};

Seedpod.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Seedpod
});

Seedpod.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.setMovementSpeed(0);
    this.monster.sleepAfter = 0;
    this.monster.isSleeping = false;
    this.monster.attackBasedOnAggro = false;
    this.monster.hasAggroTable = false;

    this.gameObject.addEventListener("Collision", function(e) {
        if(othis.exploded) {
            return;
        }

        if(e.body.orbusCollider.gameObject.layer === 15) {

            e.body.orbusCollider.gameObject.triggerEvent("TakeDamage", {dmgAmount: othis.dmgAmount, sender: othis.firingEntity, dmgType: "magical"});

            othis.broadcastToActiveClients(1, ["byte"], [1]);
            othis.monster.suicide();
            othis.exploded = true;
        }

    });

    this.gameObject.addEventListener("MonsterDeath", function() {
        othis.broadcastToActiveClients(1, ["byte"], [2]);
    });
}

Seedpod.prototype.FixedUpdate = function(args) {
    if(this.exploded) return;
    if(this.trackingTarget == null) {
        return;
    }
    if(this.monster.isDead) return;
    this.gameObject.transform.lookAt(this.trackingTarget.getWorldPosition());
    this.gameObject.transform.setDirtyRotation();
    var direction = this.gameObject.forward();
    var nextPos = new Vector3(this.gameObject.transform.position.x, this.gameObject.transform.position.y, this.gameObject.transform.position.z).add(direction.multiplyScalar(this.speed * args.delta));
    this.gameObject.transform.setNewPosition(nextPos);
}

module.exports = Seedpod;