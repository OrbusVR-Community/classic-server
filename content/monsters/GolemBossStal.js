/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var GolemBossStal = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

GolemBossStal.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: GolemBossStal
});

GolemBossStal.prototype.Start = function() {
    var othis = this;

    this.isFalling = false;
    this.totalDamageTaken = 0;
    this.damageToFall = 50;
    this.damageCausedByFalling = 300;
    this.fallSize = new Vector3(3, 1, 3);
    this.fallCastTime = 1.75;
    this.breathCenter = null;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.setMovementSpeed(0);
    this.monster.attackBasedOnAggro = false;
    this.monster.hasAggroTable = false;

    this.gameObject.addEventListener("TakeDamage", function(args) {
        if(othis.isFalling) return;

        if(args.dmgAmount === undefined || _.isNaN(args.dmgAmount)) {
            return;
        }
        othis.totalDamageTaken += args.dmgAmount;
        if(othis.totalDamageTaken >= othis.damageToFall) {
            othis.triggerFall();
        }
    });
}

GolemBossStal.prototype.triggerFall = function() {
    if(this.isFalling) return;
    console.log("TRIGGER FALL FOR STAL!");
    this.isFalling = true;
    var othis = this;
    //Create a danger zone beneath us from the ground up to where we are, then trigger our 'fall' when that danger zone expires, then kill ourselves.
    var groundHeight = this.gameObject.zone.getGroundHeightAt(this.gameObject.transform.position.x, this.gameObject.transform.position.z);
    this.breathCenter = new Vector3(this.gameObject.transform.position.x, groundHeight, this.gameObject.transform.position.z);
    this.fallSize.y = this.gameObject.transform.position.y - groundHeight;
    this.breathCenter.y += this.fallSize.y * 0.5 - 1.0;
    this.monster.dangerZone("directional", "box", this.breathCenter, this.fallSize, this.fallCastTime, 0, function(objectsHit) {
        othis.weakenBoss();
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.damageCausedByFalling), sender: othis.gameObject.entity, dmgType: "physical"});
        });
        othis.monster.suicide();
    });
}

GolemBossStal.prototype.weakenBoss = function() {
    //Get all nearby bosses, then check to see if they would be in the correct area to get weakened.
    var center = this.breathCenter;
    var size = this.fallSize;
    var collisionObjs = this.gameObject.zone.boxCast(center, new Vector3(size.x * 0.5, size.y * 0.5, size.z * 0.5));
    _.each(collisionObjs, function(anobj) {
        if(!anobj.orbusCollider.gameObject.hasMonster || anobj.orbusCollider.gameObject.layer !== 11) return;
        var bossComponent = anobj.orbusCollider.gameObject.getComponent("GolemBoss");
        if(!bossComponent) return;
        bossComponent.triggerWeakness();
    });
}

module.exports = GolemBossStal;
