var Vector2 = require('../../geometry/vector2');

function straight(target, position)
{
  return target.clone().subtract(position).normalize();
}

function seek(target, position, currentVelocity, maxVelocity, slowingRadius)
{
  var desired = target.clone().subtract(position);
  var distance = desired.length();
  desired = desired.normalize();

  if (distance <= slowingRadius) {
    desired = desired.multipyScalar( maxVelocity * (distance/slowingRadius));
  } else {
    desired = desired.multipyScalar(maxVelocity);
  }

  return desired.subtract(currentVelocity);
}

function flee(target, position, currentVelocity, maxVelocity)
{
  // chaining madness
  return position.clone().subtract(target).normalize().multiplyScalar(maxVelocity).subtract(currentVelocity);
}

function wander(currentVelocity, wanderDistance, wanderRadius, wanderAngle)
{
  // wanderAngle should be something like:œ
  // wanderAngle += Math.random() * angleChange - angleChange * .5;
  var force = currentVelocity.clone().normalize().multiplyScalar(wanderDistance);
  var displacement = Vector2(0,-1).multiplyScaler(wanderRadius).setAngle(wanderAngle);
  force = force.add(displacement);
  displacement.free();
  return force; // force applied
}

function evade(target, position, maxVelocity, currentVelocity, targetVelocity)
{
  var distance = target.clone().subtract(position);
  var updatesNeeded = distance.length() / maxVelocity;
  distance.free();
  var tv = targetVelocity.clone().multiplyScalar(updatesNeeded);
  var targetFuturePosition = targetVelocity.clone().add(tv);
  tv.free();
  var force = flee(targetFuturePosition, position, currentVelocity, maxVelocity);
  targetFuturePosition.free();
  return force;
}

function pursuit(target, position, maxVelocity, currentVelocity, targetVelocity)
{
  var distance = target.clone().subtract(position);
  var updatesNeeded = distance.length() / maxVelocity;
  distance.free();
  var tv = targetVelocity.clone().multiplyScaler(updatesNeeded);
  var targetFuturePosition = targetVelocity.clone().add(tv);
  tv.free();
  var force = seek(targetFuturePosition, position, currentVelocity, maxVelocity, 0);
  targetFuturePosition.free();
  return force;
}

function avoidance(target, position, velocity, maxAvoidAhead, maxVelocity, avoidanceForce)
{
  var tv = velocity.clone().normalize().multiplyScalar((maxAvoidAhead * velocity.length()) / maxVelocity);
  var force = position.clone().add(tv).subtract(target).normalize().multiplyScalar(avoidanceForce);
  tv.free();
  return force;
}

exports = module.exports = {
  straight: straight,
  seek: seek,
  flee: flee,
  wander: wander,
  pursuit: pursuit,
  avoidance: avoidance
};
