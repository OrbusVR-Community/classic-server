/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;

var EliteCrab = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

EliteCrab.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: EliteCrab
});

EliteCrab.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.lootTier = 4;
    if(this.gameObject.zone.zoneInfo.safetyLevel < 0.5 && this.gameObject.zone.zoneInfo.isOverworld) {
        this.monster.allowEpicDrop = true;
    }
    this.monster.trackingDistance = 4.0;
    this.monster.setMovementSpeed(6.5);
    
    this.monster.defaultModifiers.armorBoostPercent = 1.50;

    this.lastJump = 100;
    this.allowJumpEvery = 6;
    this.jumpPotency = 350;

    this.gameObject.addEventListener("InfrequentFixedUpdate", function(args) {

        othis.lastJump += args.delta;

        if(othis.lastJump > othis.allowJumpEvery && othis.monster.trackingTarget) {
            othis.monster.aggroRandomTargetFromTable(othis.monster.potencyDamage(500));
            //Check the distance.
            //console.log("CHECK JUMP");
            var distToTarget = othis.monster.trackingTarget.getWorldPosition().distanceTo(othis.gameObject.getWorldPosition());
            if(distToTarget > othis.monster.trackingDistance + 0.5 && distToTarget < 60) {
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


module.exports = EliteCrab;
