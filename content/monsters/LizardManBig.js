/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var LizardManBig = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

LizardManBig.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: LizardManBig
});

LizardManBig.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4.0;

    this.timeSinceLinecharge = 0;
    this.LinechargeEveryAttacks = 3;

    this.explodeRadius = 5;
    this.explodeCastTime = 1.5;
    this.explodePotency = 800;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.timeSinceLinecharge += 1;

        if(othis.timeSinceLinecharge > othis.LinechargeEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.explode(args.finishOpportunity);
                othis.timeSinceLinecharge = 0;
                return;
            }
        }
    });
}

LizardManBig.prototype.explode = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    // var suckCenter = this.gameObject.transform.position;
    // this.broadcastToActiveClients(1, ["float", "float"], [this.soulsuckRadius, this.soulsuckCastTime]); 

    this.monster.dangerZone("directional", "sphere", this.gameObject.transform.position, this.explodeRadius, this.explodeCastTime, 1, function(collisionObjs) {
        var soulsuckDamage = othis.monster.potencyDamage(othis.explodePotency);
        _.each(collisionObjs, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "magical"});
        });
        finishCallback();
    });
};

module.exports = LizardManBig;
