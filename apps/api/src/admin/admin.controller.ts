import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { INFRACTIONS, PACK_TIERS, phoneSchema } from '@kle/shared';
import { z } from 'zod';
import { AmbassadorsService } from '../ambassadors/ambassadors.service.js';
import { CurrentUser, Staff, type AuthUser } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { AdminService } from './admin.service.js';

const decisionSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});
const kycDecisionSchema = decisionSchema.extend({
  documentNumber: z.string().trim().min(4).max(40).optional(),
});
const reportDecisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('dismiss') }),
  z.object({
    action: z.literal('sanction'),
    infraction: z.enum(INFRACTIONS).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
]);
const fraudDecisionSchema = z.object({
  confirm: z.boolean(),
  infraction: z.enum(INFRACTIONS).optional(),
  note: z.string().trim().max(1000).optional(),
});
const sanctionSchema = z.object({
  infraction: z.enum(INFRACTIONS),
  note: z.string().trim().max(1000).optional(),
  listingId: z.uuid().optional(),
});
const noteSchema = z.object({ note: z.string().trim().min(3).max(1000) });
const countrySchema = z.object({
  active: z.boolean().optional(),
  packPrices: z.record(z.enum(PACK_TIERS), z.number().int().min(0)).optional(),
  successFeeBps: z.number().int().min(0).max(3_000).optional(),
});
const staffSchema = z.object({ phone: phoneSchema, role: z.enum(['moderator', 'supervisor', 'admin']) });
const ambassadorSchema = z.object({
  userId: z.uuid(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/).optional(),
  bonusPerLandlord: z.number().int().min(0).max(100_000).optional(),
});

/**
 * Droits : le modérateur valide ou refuse ; le superviseur suspend, bannit et rembourse ;
 * l'administrateur gère les prix, les pays et les comptes de l'équipe.
 */
@Controller('admin')
@Staff('moderator')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly ambassadors: AmbassadorsService,
    private readonly clock: Clock,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('kyc')
  kycQueue() {
    return this.admin.kycQueue();
  }

  @Get('kyc/:id')
  kycDetail(@CurrentUser() staff: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.kycDetail(staff, id);
  }

  @Post('kyc/:id/decision')
  @HttpCode(200)
  decideKyc(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(kycDecisionSchema)) body: z.output<typeof kycDecisionSchema>,
  ) {
    return this.admin.decideKyc(staff, id, body);
  }

  @Get('proofs')
  proofsQueue() {
    return this.admin.proofsQueue();
  }

  @Get('proofs/:id')
  proofDetail(@CurrentUser() staff: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.proofDetail(staff, id);
  }

  @Post('proofs/:id/decision')
  @HttpCode(200)
  decideProof(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(decisionSchema)) body: z.output<typeof decisionSchema>,
  ) {
    return this.admin.decideProof(staff, id, body);
  }

  @Get('listings')
  listingsQueue() {
    return this.admin.listingsQueue();
  }

  @Post('listings/:id/decision')
  @HttpCode(200)
  decideListing(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(decisionSchema)) body: z.output<typeof decisionSchema>,
  ) {
    return this.admin.decideListing(staff, id, body);
  }

  @Get('reports')
  reportsQueue() {
    return this.admin.reportsQueue();
  }

  @Post('reports/:id/decision')
  @HttpCode(200)
  decideReport(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(reportDecisionSchema)) body: z.output<typeof reportDecisionSchema>,
  ) {
    return this.admin.decideReport(staff, id, body);
  }

  @Get('fraud-signals')
  fraudQueue() {
    return this.admin.fraudQueue();
  }

  @Post('fraud-signals/:id/decision')
  @HttpCode(200)
  decideFraud(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(fraudDecisionSchema)) body: z.output<typeof fraudDecisionSchema>,
  ) {
    return this.admin.decideFraud(staff, id, body);
  }

  @Get('users')
  searchUsers(@Query('q') q = '') {
    return this.admin.searchUsers(q);
  }

  @Get('users/:id')
  userDetail(@CurrentUser() staff: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.userDetail(staff, id);
  }

  @Post('users/:id/sanctions')
  sanction(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(sanctionSchema)) body: z.output<typeof sanctionSchema>,
  ) {
    return this.admin.sanctionUser(staff, id, body);
  }

  @Staff('supervisor')
  @Post('users/:id/reactivate')
  @HttpCode(200)
  reactivate(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(noteSchema)) body: z.output<typeof noteSchema>,
  ) {
    return this.admin.reactivateUser(staff, id, body.note);
  }

  @Staff('supervisor')
  @Post('payments/:id/refund')
  @HttpCode(200)
  refund(
    @CurrentUser() staff: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(noteSchema)) body: z.output<typeof noteSchema>,
  ) {
    return this.admin.refundPayment(staff, id, body.note);
  }

  @Get('waitlist')
  waitlist(@Query('role') role?: string) {
    return this.admin.waitlist(role);
  }

  @Get('waitlist.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="kle-liste-attente.csv"')
  async waitlistCsv(@CurrentUser() staff: AuthUser) {
    return `﻿${await this.admin.waitlistCsv(staff)}`;
  }

  @Get('ambassadors')
  listAmbassadors() {
    return this.ambassadors.list();
  }

  @Staff('admin')
  @Post('ambassadors')
  createAmbassador(@Body(new ZodPipe(ambassadorSchema)) body: z.output<typeof ambassadorSchema>) {
    return this.ambassadors.create(body.userId, body.code, body.bonusPerLandlord);
  }

  @Get('ambassador-rewards')
  rewards(@Query('status') status?: 'due' | 'paid') {
    return this.ambassadors.rewards(status);
  }

  @Staff('supervisor')
  @Post('ambassador-rewards/:id/paid')
  @HttpCode(200)
  rewardPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.ambassadors.markPaid(id, this.clock.now());
  }

  @Get('countries')
  countries() {
    return this.admin.countries();
  }

  @Staff('admin')
  @Patch('countries/:code')
  updateCountry(
    @CurrentUser() staff: AuthUser,
    @Param('code') code: string,
    @Body(new ZodPipe(countrySchema)) body: z.output<typeof countrySchema>,
  ) {
    return this.admin.updateCountry(staff, code, body as Parameters<AdminService['updateCountry']>[2]);
  }

  @Get('cities')
  cities() {
    return this.admin.allCities();
  }

  @Staff('admin')
  @Post('cities/:id/open')
  @HttpCode(200)
  openCity(@CurrentUser() staff: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.setCityActive(staff, id, true);
  }

  @Staff('admin')
  @Post('staff')
  createStaff(@CurrentUser() staff: AuthUser, @Body(new ZodPipe(staffSchema)) body: z.output<typeof staffSchema>) {
    return this.admin.createStaff(staff, body.phone, body.role);
  }

  @Staff('admin')
  @Get('audit-logs')
  auditLogs() {
    return this.admin.auditLogs();
  }
}
