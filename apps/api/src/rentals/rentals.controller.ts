import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { confirmRentalSchema, phoneSchema } from '@kle/shared';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { RentalsService } from './rentals.service.js';

const paySchema = z.object({ operator: z.enum(['mtn', 'orange']), payerPhone: phoneSchema });

@Controller()
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @Get('listings/:id/contacts')
  contacts(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rentals.contacts(user, id);
  }

  /** Le bailleur marque son logement « Loué » sous 48 h et choisit le locataire. */
  @Post('listings/:id/rented')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(confirmRentalSchema)) body: z.output<typeof confirmRentalSchema>,
  ) {
    return this.rentals.confirmRental(user, id, body);
  }

  @Get('success-fees')
  myFees(@CurrentUser() user: AuthUser) {
    return this.rentals.myFees(user.id);
  }

  @Post('success-fees/:id/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(paySchema)) body: z.output<typeof paySchema>,
  ) {
    return this.rentals.payFee(user, id, body);
  }
}
