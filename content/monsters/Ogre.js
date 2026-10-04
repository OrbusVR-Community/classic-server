/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var Ogre = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Ogre.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Ogre
});

Ogre.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 3.5;

    this.tankbusterEvery = 5;
    this.timeSinceTankbuster = 0;
    this.tankBusterPotency = 800;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceTankbuster++;
        if(othis.timeSinceTankbuster > othis.tankbusterEvery) {
            if(args.takeOpportunity()) {
                othis.tankBuster(args.finishOpportunity);
                othis.timeSinceTankbuster = 0;
            }
        }
    });
}

Ogre.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1500);
    cb();

}

module.exports = Ogre;