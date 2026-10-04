/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var PyramidMan = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

PyramidMan.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: PyramidMan
});

PyramidMan.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4.0;

    this.timeSinceLinecharge = 0;
    this.LinechargeEveryAttacks = 3;

    this.timeSinceBigBlast = 0;
    this.bigBlastEveryAttacks = 4;

    this.explodeBox = new Vector3(1.0, 3.0, 4.0);
    this.explodeCastTime = 1.0;
    this.explodePotency = 800;

    this.bigBlastBox = new Vector3(5.0, 4.0, 10.0);
    this.bigBlastCastTime = 2.0;
    this.bigBlastPotency = 1600;

    this.LinechargeForwardOffset = 1.0; //how far forward to shift the breath from the center of the monster to the front.

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {

        othis.timeSinceLinecharge += 1;
        othis.timeSinceBigBlast += 1;

        if(othis.timeSinceLinecharge > othis.LinechargeEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.explode(args.finishOpportunity);
                othis.timeSinceLinecharge = 0;
                return;
            }
        }
        else if(othis.timeSinceBigBlast > othis.bigBlastEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.bigBlast(args.finishOpportunity);
                othis.timeSinceBigBlast = 0;
                return;
            }
        }
    });
}

PyramidMan.prototype.explode = function(finishCallback) {
    var othis = this;
    var LinechargeCenter = this.gameObject.forward().multiplyScalar(this.LinechargeForwardOffset + this.explodeBox.z * 0.5).add(this.gameObject.transform.position);
    LinechargeCenter.y += this.explodeBox.y * 0.5 - 1.0;
    this.monster.dangerZone("directional", "box", LinechargeCenter, this.explodeBox, this.explodeCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.explodePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 500); //give time for Linecharge attack to finish.
        
    });
};

PyramidMan.prototype.bigBlast = function(finishCallback) {
    var othis = this;
    var LinechargeCenter = this.gameObject.forward().multiplyScalar(this.LinechargeForwardOffset + this.bigBlastBox.z * 0.5).add(this.gameObject.transform.position);
    LinechargeCenter.y += this.bigBlastBox.y * 0.5 - 1.0;
    this.monster.dangerZone("directional", "box", LinechargeCenter, this.bigBlastBox, this.bigBlastCastTime, 2, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.bigBlastPotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 500); //give time for Linecharge attack to finish.
        
    });
};

module.exports = PyramidMan;
