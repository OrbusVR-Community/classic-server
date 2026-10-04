/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var JungleTiger = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

JungleTiger.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: JungleTiger
});

JungleTiger.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 3.0;
    this.monster.setMovementSpeed(6.5);
    this.monster.roamEverySeconds = 15.0;
    this.monster.roamDistance = 25;

    this.lastJump = 100;
    this.allowJumpEvery = 6;
    this.jumpPotency = 600;

    this.clawPotency = 600;
    this.clawEvery = 4;
    this.timeSinceClaw = 0;

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceClaw++;
        if(othis.timeSinceClaw > othis.clawEvery) {
            if(args.takeOpportunity()) {
                othis.monster.triggerAnimation("specialattack");
                othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: othis.monster.potencyDamage(othis.clawPotency), sender: othis.gameObject.entity, dmgType: "physical"}, 1000);
                args.finishOpportunity();
                othis.timeSinceClaw = 0;
            }
        }
    })

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        othis.lastJump += args.delta;
        if(othis.monster.trackingTarget != null && othis.monster.navagent.isPathfinding && othis.lastJump > othis.allowJumpEvery) {
            //Check the distance.
            //console.log("CHECK JUMP");
            var distToTarget = othis.monster.trackingTarget.getWorldPosition().distanceTo(othis.gameObject.getWorldPosition());
            if(distToTarget > othis.monster.trackingDistance + 0.5 && distToTarget < 18) {
                //Leap!
                //console.log("LEAP TO TARGET!");
                var targetpos = othis.monster.findPointNearObject(othis.monster.trackingTarget, othis.monster.trackingDistance - 0.25);
                if(targetpos) {
                    othis.lastJump = 0;
                    othis.monster.triggerAnimation("jumpattack");
                    setTimeout(function() {
                        if(!othis.gameObject || !othis.monster || othis.monster.isDead) return;
                        console.log("FINISH LEAP!");
                        othis.gameObject.transform.setNewPosition(targetpos);
                        othis.monster.cancelPathfinding();
                        othis.monster.snapToGrid();
                        othis.monster.timeSinceBasicAttack = 0;
                        othis.monster.dealMeleeDamage(othis.monster.trackingTarget, {dmgAmount: othis.monster.potencyDamage(othis.jumpPotency), sender: othis.gameObject.entity, dmgType: "physical"}, 1000);
                    }, 250);
                    
                }
                else {
                    //console.log("Couldn't fin da valid destination...");
                }
            }
        }
    });
}


module.exports = JungleTiger;
