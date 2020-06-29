import redis from "redis";
import { promisify } from 'util';


const redisClient = redis.createClient({
  host: 'api-redis',
});

redisClient.on("error", function(error) {
  console.error(error);
});

// let redisGetAsync = promisify(redisClient.get).bind(redisClient);
let redisHMGetAllAsync = promisify(redisClient.hgetall).bind(redisClient);
let redisDelAsync = promisify(redisClient.del).bind(redisClient);

interface IUserResourceScope {
  resource: string,
  scope: string,
  currentUserId: string,
  project?: number,
  group?: string,
  users?: number[]
}

const hashKey = ({ resource, project, group, scope }: IUserResourceScope) =>
  `${resource}:${project ? `${project}:`: ''}${group ? `${group}:`: ''}${scope}`;


export const isRedisCacheAllowed = async (resourceScope: IUserResourceScope) => {
  const redisHash = await redisHMGetAllAsync(`cache:authz:${resourceScope.currentUserId}`);
  const key = hashKey(resourceScope);

  if (redisHash && !redisHash[key]) {
    return null;
  }

  return (redisHash && redisHash[key] === 1) ? true : false;
}

export const saveRedisCache = async (resourceScope: IUserResourceScope, value: number|string) => {
  const key = hashKey(resourceScope);
  await redisClient.hmset(`cache:authz:${resourceScope.currentUserId}`,  key, value);
}

export const deleteRedisUserCache = (userId) => redisDelAsync(`cache:authz:${userId}`);

export default {
  isRedisCacheAllowed,
  saveRedisCache,
  deleteRedisUserCache
};