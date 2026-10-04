/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var StatusEffects = require("orbus").StatusEffects;

var MagicDeer = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

MagicDeer.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: MagicDeer
});

MagicDeer.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 40;
    this.monster.basicAttackEvery = 6;

    this.LinechargeSize = new Vector3(4, 4, 8);
    this.LinechargeForwardOffset = 1.4; //how far forward to shift the breath from the center of the monster to the front.
    this.LinechargeCastTime = 1.5;
    this.LinechargePotency = 1000;

    this.isMagic = true;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        //Choose a random target, do a line attack to them, attacking everything else in-between.
        if(!othis.isMagic) return;

        args.takeOpportunity();
        
        var randomTarget = _.sample(othis.monster.getSortedAggroTable());
        if(randomTarget) {
            othis.monster.turnToward(randomTarget.targetGo.getWorldPosition());
            var zLength = othis.gameObject.getWorldPosition().distanceTo(randomTarget.targetGo.getWorldPosition()) + 4;
            othis.LinechargeSize.z = zLength;
            othis.lineAttack(args.finishOpportunity);
        }
    });

    this.gameObject.addEventListener("PacifyMagic", function() {
        othis.isMagic = false;
        othis.monster.trackingDistance = 4;
        othis.monster.basicAttackEvery = 2;
    });
}

MagicDeer.prototype.lineAttack = function(callback) {
    var othis = this;
    console.log("LINE ATTACK");
    //Center point is where I am, +1 + 1/2 size * forward vector
    var LinechargeCenter = this.gameObject.forward().multiplyScalar(this.LinechargeForwardOffset + this.LinechargeSize.z * 0.5).add(this.gameObject.transform.position);
    LinechargeCenter.y += this.LinechargeSize.y * 0.5 - 1.0;
    //this.broadcastToActiveClients(1, ["vector3", "vector3", "float"], [LinechargeCenter, this.LinechargeSize, this.LinechargeCastTime]);
    this.monster.dangerZone("directional", "box", LinechargeCenter, this.LinechargeSize, this.LinechargeCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.LinechargePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        var currentPosition = othis.gameObject.getWorldPosition();
        var newPosition = currentPosition.add(othis.gameObject.forward().multiplyScalar(othis.LinechargeSize.z));
        newPosition.y = othis.gameObject.zone.getGroundHeightAt(newPosition.x, newPosition.z);
        othis.gameObject.transform.setNewPosition(newPosition);
        othis.gameObject.transform.updateMatrixWorld();
        callback();
    });
}

module.exports = MagicDeer;
