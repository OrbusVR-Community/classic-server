/* @flow */
var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;

var Ghost = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);
};

Ghost.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Ghost
});

Ghost.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");

    this.timeSinceSuck = 0;
    this.suckEverySeconds = 6;

    this.soulsuckRadius = 5;
    this.soulsuckCastTime = 2;
    this.soulsuckPotency = 600;

    this.addSyncedVar(1, "fadedOut", "bool", false);

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        othis.timeSinceSuck += args.delta;

        //if(othis.monster.getSyncedVar("willLevel") > 4) {
        if(false) {

            // if(othis.getSyncedVar("fadedOut")) {
            //     if(Chance.rollPercentChance(50)) {
            //         othis.fadeIn();
            //     }
            //     else {
            //         if(args.takeOpportunity()) {
            //             args.finishOpportunity();
            //         }
            //     }
            //     return;
            // }
            // else {
                if(Chance.rollPercentChance(50)) {
                    othis.teleportBehindTarget(othis.monster.trackingTarget, true);
                    if(args.takeOpportunity()) {
                        args.finishOpportunity();
                    }
                    return;
                }
            //}

        }

        if(othis.timeSinceSuck > othis.suckEverySeconds) {
            if(args.takeOpportunity()) {
                if(othis.monster.getSyncedVar("willLevel") > 4) {
                    var aggroTable = othis.monster.getSortedAggroTable();
                    if(aggroTable.length > 1) { //multiple targets
                        var chosenTarget = _.sample(aggroTable);
                        if(chosenTarget) {
                            othis.teleportBehindTarget(chosenTarget.targetGo);
                        }
                    }
                }
                othis.soulSuck(args.finishOpportunity);
                othis.timeSinceSuck = 0;
            }
        }
    });
}

Ghost.prototype.soulSuck = function(finishCallback) {
    var othis = this;
    //Center point is where I am, +1 + 1/2 size * forward vector
    // var suckCenter = this.gameObject.transform.position;
    // this.broadcastToActiveClients(1, ["float", "float"], [this.soulsuckRadius, this.soulsuckCastTime]); 

    this.monster.dangerZone("directional", "sphere", this.gameObject.transform.position, this.soulsuckRadius, this.soulsuckCastTime, 1, function(collisionObjs) {
        var soulsuckDamage = othis.monster.potencyDamage(othis.soulsuckPotency);
        var targetsHit = 0;
        _.each(collisionObjs, function(anobj) {
            othis.monster.dealAoeDamage(anobj.orbusCollider.gameObject, {dmgAmount: soulsuckDamage, sender: othis.gameObject.entity, dmgType: "magical"});
            targetsHit++;
        });
        //Heal myself based ont he amount of targets I hit.
        othis.gameObject.triggerEvent("TakeDamage", {dmgAmount: -1 * targetsHit * soulsuckDamage * 0.5, dmgType: "magical"});
        setTimeout(function() {
            finishCallback();
        }, 1000); //give time for breath animation to finish before we make our next move.
    });
};

Ghost.prototype.teleportBehindTarget = function(targetObj, stayHidden) {
    this.fadeOut();
    this.monster.cancelPathfinding();
    var forward = (targetObj.entity.head ? targetObj.entity.head.forward() : targetObj.forward());
    var destPos = targetObj.getWorldPosition().sub(forward.normalize().multiplyScalar(2));
    this.gameObject.transform.setNewPosition(destPos);
    this.monster.navagent.snapToGrid();
    var othis = this;
    // if(!stayHidden) {
    //     setTimeout(function() {
    //         othis.fadeIn();
    //     }, 500);
    // }
}

Ghost.prototype.fadeOut = function() {
    var othis = this;
    this.setSyncedVar("fadedOut", true);
    this.monster.phaseOut();
    setTimeout(function() {
        if(!othis.gameObject || !othis.gameObject.entity || othis.gameObject.entity.selfDestructing === true) return;
        othis.fadeIn();
    }, 1000);
    //this.gameObject.layer = 99;
}

Ghost.prototype.fadeIn = function() {
    this.setSyncedVar("fadedOut", false);
    this.monster.phaseIn();
    //this.gameObject.layer = 11;
}

module.exports = Ghost;