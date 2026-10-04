/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var CrabBoss = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

CrabBoss.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: CrabBoss
});

CrabBoss.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 6;
    this.monster.giveUpChaseAfter = 120;
    this.monster.basicAttackPotency = 150;

    this.tankbusterEvery = 2;
    this.timeSinceTankbuster = 0;
    this.tankBusterPotency = 800; //800

    this.timeSinceAoe = 0;
    this.AoeEveryAttacks = 4;
    this.AoeSize = 12;
    this.AoeCastTime = 2.0;
    this.AoePotency = 600; //600

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceTankbuster++;
        othis.timeSinceAoe++;

        if(othis.timeSinceTankbuster > othis.tankbusterEvery) {
            if(args.takeOpportunity()) {
                othis.tankBuster(args.finishOpportunity);
                othis.timeSinceTankbuster = 0;
                return;
            }
        }

        if(othis.timeSinceAoe > othis.AoeEveryAttacks) {
            if(args.takeOpportunity()) {
                othis.aoeAttack(args.finishOpportunity);
                othis.timeSinceAoe = 0;
                return;
            }
        }
    });
}

CrabBoss.prototype.tankBuster = function(cb) {
    var othis = this;
    var dmgAmount = othis.monster.potencyDamage(othis.tankBusterPotency);
    othis.monster.triggerAnimation("tankbuster");
    othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: dmgAmount, sender: othis.gameObject.entity, dmgType: "physical"}, 1000);
    setTimeout(function() {
        cb();
    }, 1500);
    
};

CrabBoss.prototype.aoeAttack = function(finishCallback) {
    var othis = this;
    console.log("AOE ATTACK");
    //Center point is where I am, +1 + 1/2 size * forward vector
    var AoeCenter = this.gameObject.transform.position;
    this.monster.dangerZone("directional", "sphere", AoeCenter, this.AoeSize, this.AoeCastTime, 1, function(objectsHit) {
        _.each(objectsHit, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: othis.monster.potencyDamage(othis.AoePotency), sender: othis.gameObject.entity, dmgType: "magical"});
        });
        setTimeout(function() {
            finishCallback();
        }, 500); //give time for Aoe attack to finish.
        
    });
};

module.exports = CrabBoss;