/* @flow */

var NetComponent = require("orbus").NetComponent;
var _ = require("underscore");
var Vector3 = require("three").Vector3;
var Quaternion = require("three").Quaternion;
var Chance = require("orbus").Chance;

var Sandworm = function(componentId, componentName, gameObjectId, componentOpts) {
    NetComponent.call(this, componentId, componentName, gameObjectId, componentOpts);

    this.isBossWorm = componentOpts.bossWorm;
};

Sandworm.prototype = Object.assign( Object.create( NetComponent.prototype), {
    constructor: Sandworm
});

Sandworm.prototype.Start = function() {
    var othis = this;

    this.monster = this.gameObject.getComponent("Monster");
    this.monster.trackingDistance = 4.7;

    this.addSyncedVar(1, "aboveground", "bool", true);

    if(this.isBossWorm) {
        console.log("BOSS WORM SPAWNED!");
        var currentWorms = (this.gameObject.zone.getZoneVar("bossWormsAlive") || 0) + 1;
        console.log("NUM BOSS WORMS IS NOW: " + currentWorms);
        this.gameObject.zone.setZoneVar("bossWormsAlive", currentWorms);
        this.gameObject.zone.setZoneVar("bossWormsKilled", false);

        //Monster move opportunity not happening when phased out? Use a setTimoeut call instead....?

        this.gameObject.addEventListener("MonsterDeath", function() {
            console.log("BOSS WORM DIED!");
            var currentWorms = othis.gameObject.zone.getZoneVar("bossWormsAlive") - 1;
            othis.gameObject.zone.setZoneVar("bossWormsAlive", currentWorms);
            console.log("NUMBER BOSS WORMS IS NOW: " + currentWorms);
            if(currentWorms < 1) {
                console.log("ALL BOSS WORMS KILLED! SPAWN BOSS!");
                othis.gameObject.zone.setZoneVar("bossWormsKilled", true);
            }
        });

    }

    this.gameObject.addEventListener("MonsterMoveOpportunity", function(args) {
        
        if(othis.getSyncedVar("aboveground")) {
            if(Chance.rollPercentChance(30)) {
                if(args.takeOpportunity()) {
                    othis.setSyncedVar("aboveground", false);
                    setTimeout(function() {
                        if(!othis.monster || !othis.gameObject || !othis.gameObject.entity || othis.monster.isDead) return;
                        othis.monster.phaseOut();
                        args.finishOpportunity();
                    }, 1500);
                    setTimeout(function() {
                        if(!othis.monster || !othis.gameObject || !othis.gameObject.entity || othis.monster.isDead) return;
                        var aggroTable = othis.monster.getSortedAggroTable();
                        var chosenTarget = _.sample(aggroTable);
                        if(chosenTarget) {
                            othis.monster.addMaxAggroForEntity(chosenTarget);
                            othis.teleportBehindTarget(chosenTarget.targetGo);
                        }
                        else {
                            othis.teleportBehindTarget(othis.monster.trackingTarget);
                        }
                        othis.fadeIn();
                    }, 5000);
                }
            }
        }
        else {
            //Never do anything below ground.
            args.takeOpportunity();
            args.finishOpportunity();
        }

    });
}

Sandworm.prototype.fadeIn = function() {
    this.setSyncedVar("aboveground", true);
    this.monster.phaseIn();
}

Sandworm.prototype.teleportBehindTarget = function(targetObj) {
    if(!targetObj || !targetObj.entity) return;
    this.monster.cancelPathfinding();
    var forward = (targetObj.entity.head ? targetObj.entity.head.forward() : targetObj.forward());
    var destPos = targetObj.getWorldPosition().sub(forward.normalize().multiplyScalar(5));
    this.gameObject.transform.setNewPosition(destPos);
    this.monster.navagent.snapToGrid();
}


module.exports = Sandworm;
