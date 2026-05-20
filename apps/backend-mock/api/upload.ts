import { eventHandler } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';

export default eventHandler((event) => {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    return unAuthorizedResponse(event);
  }
  return useResponseSuccess({
    url: 'https://tempapi.huiyifamily.com/profile/avatar/2024/08/12/logo.jpg',
  });
  // return useResponseError("test")
});
