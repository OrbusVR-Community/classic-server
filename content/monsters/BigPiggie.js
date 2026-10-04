/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var BigPiggie = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

BigPiggie.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: BigPiggie
});

BigPiggie.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4.5;

    this.timeSinceLinecharge = 0;
    this.LinechargeEveryAttacks = 3;

    this.LinechargeSize = new Vector3(3, 4, 12);
    this.LinechargeForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.LinechargeCastTime = 1.5;
    this.LinechargePotency = 800;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.timeSinceLinecharge += 1;

        if(othis.timeSinceLinecharge > othis.LinechargeEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.lineAttack(args.finishOpportunity);
                othis.timeSinceLinecharge = 0;
                return;
            }
        }
    });
}

BigPiggie.prototype.lineAttack = function(finishCallback) {
    var othis = this;
    console.log("AOE ATTACK");
    var LinechargeCenter = this.gameObject.forward().multiplyScalar(this.LinechargeForwardOffset + this.LinechargeSize.z * 0.5).add(this.gameObject.transform.position);
    LinechargeCenter.y += this.LinechargeSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [LinechargeCenter, this.LinechargeSize, this.LinechargeCastTime]);
    this.monster.dangerZone("directional", "box", LinechargeCenter, this.LinechargeSize, this.LinechargeCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.LinechargePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 500); //give time for Linecharge attack to finish.
        
    });
};
module.exports = BigPiggie;
