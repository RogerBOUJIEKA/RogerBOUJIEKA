CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'frozen', 'blocked_unpaid', 'suspended', 'banned');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."fraud_status" AS ENUM('open', 'dismissed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."housing_type" AS ENUM('chambre', 'studio', 'appartement', 'maison', 'villa', 'duplex');--> statement-breakpoint
CREATE TYPE "public"."id_document_type" AS ENUM('cni', 'passport', 'driving_license', 'voter_card');--> statement-breakpoint
CREATE TYPE "public"."infraction" AS ENUM('listing_taken_not_updated', 'price_mismatch', 'money_before_visit', 'fake_listing', 'fake_document', 'success_fee_unpaid', 'account_sharing', 'undeclared_third_party', 'abusive_behavior');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."listing_category" AS ENUM('rental', 'coming_soon');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'taken', 'hidden', 'removed');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('video', 'photo');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('uploading', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."mobile_operator" AS ENUM('mtn', 'orange');--> statement-breakpoint
CREATE TYPE "public"."pack_tier" AS ENUM('essentiel', 'confort', 'premium');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('pack', 'success_fee', 'boost');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."proof_role" AS ENUM('landlord', 'outgoing_tenant');--> statement-breakpoint
CREATE TYPE "public"."proof_type" AS ENUM('utility_bill', 'property_tax_receipt', 'lease_or_rent_receipt', 'property_title', 'power_of_attorney');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('fake_listing', 'money_before_visit', 'already_taken', 'price_mismatch', 'abusive_behavior');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('listing', 'user');--> statement-breakpoint
CREATE TYPE "public"."sanction_kind" AS ENUM('warning', 'listing_hidden', 'suspension', 'permanent_ban', 'blocked_until_paid', 'fees_due_and_suspension');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('moderator', 'supervisor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."success_fee_status" AS ENUM('pending', 'paid', 'overdue', 'waived');--> statement-breakpoint
CREATE TYPE "public"."tenancy_status" AS ENUM('pending_fee', 'active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."visit_outcome" AS ENUM('interested', 'not_interested', 'no_show', 'rented');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('pending', 'accepted', 'refused', 'cancelled', 'validated', 'expired');--> statement-breakpoint
CREATE TYPE "public"."waitlist_role" AS ENUM('seeker', 'landlord', 'outgoing_tenant');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"district_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"type" "housing_type",
	"min_rent" integer,
	"max_rent" integer NOT NULL,
	"move_in_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"last_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ambassador_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ambassador_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ambassador_rewards_landlordId_unique" UNIQUE("landlord_id")
);
--> statement-breakpoint
CREATE TABLE "ambassadors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"bonus_per_landlord" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ambassadors_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "ambassadors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banned_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"value_hash" text NOT NULL,
	"sanction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" char(2) NOT NULL,
	"code" char(3) NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"listing_seq" integer DEFAULT 0 NOT NULL,
	"centroid" geometry(point, 4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_request_id" uuid NOT NULL,
	"seeker_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_visitRequestId_unique" UNIQUE("visit_request_id")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" char(3) NOT NULL,
	"dial_code" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"pack_prices" jsonb NOT NULL,
	"success_fee_bps" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"name" text,
	"selfie_check_key" text,
	"last_selfie_check_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "district_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"water" smallint NOT NULL,
	"electricity" smallint NOT NULL,
	"security" smallint NOT NULL,
	"flooding" smallint NOT NULL,
	"roads" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"centroid" geometry(point, 4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "fraud_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"details" jsonb,
	"status" "fraud_status" DEFAULT 'open' NOT NULL,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" "id_document_type" NOT NULL,
	"document_front_key" text NOT NULL,
	"document_back_key" text,
	"selfie_key" text NOT NULL,
	"declared_name" text NOT NULL,
	"document_number" text,
	"status" "decision_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"moderator_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"provider" text NOT NULL,
	"provider_asset_id" text NOT NULL,
	"playback_url" text,
	"thumbnail_url" text,
	"status" "media_status" DEFAULT 'uploading' NOT NULL,
	"captured_in_app" boolean DEFAULT false NOT NULL,
	"captured_at" timestamp with time zone,
	"capture_location" geometry(point, 4326),
	"duration_seconds" integer,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"publisher_id" uuid NOT NULL,
	"category" "listing_category" DEFAULT 'rental' NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"type" "housing_type" NOT NULL,
	"title" text,
	"monthly_rent" integer NOT NULL,
	"advance_months" smallint NOT NULL,
	"deposit" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"city_id" uuid NOT NULL,
	"district_id" uuid NOT NULL,
	"exact_address" text NOT NULL,
	"location" geometry(point, 4326) NOT NULL,
	"approx_location" geometry(point, 4326) NOT NULL,
	"amenities" jsonb NOT NULL,
	"available_from" date,
	"coming_soon" jsonb,
	"published_at" timestamp with time zone,
	"needs_post_review" boolean DEFAULT false NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"last_confirmed_at" timestamp with time zone,
	"availability_check_sent_at" timestamp with time zone,
	"taken_at" timestamp with time zone,
	"hidden_reason" text,
	"public_alerts_sent_at" timestamp with time zone,
	"boosted_until" timestamp with time zone,
	"validated_visits" integer DEFAULT 0 NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"reported_by_id" uuid NOT NULL,
	"description" text NOT NULL,
	"photo_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"body" text,
	"call_duration_seconds" integer,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"channels" text[] DEFAULT '{in_app}'::text[] NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"channel" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "proof_role" NOT NULL,
	"proof_type" "proof_type" NOT NULL,
	"file_keys" text[] NOT NULL,
	"honor_declared_at" timestamp with time zone NOT NULL,
	"status" "decision_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"moderator_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "pack_tier" NOT NULL,
	"country_code" char(2) NOT NULL,
	"price" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"visit_requests_total" integer NOT NULL,
	"visit_requests_used" integer DEFAULT 0 NOT NULL,
	"bonus_days" integer DEFAULT 0 NOT NULL,
	"not_found_bonus_applied" boolean DEFAULT false NOT NULL,
	"ended_reason" text,
	"payment_id" uuid,
	"renewal_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"pack_tier" "pack_tier",
	"success_fee_id" uuid,
	"listing_id" uuid,
	"amount" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"operator" "mobile_operator" NOT NULL,
	"payer_phone" text NOT NULL,
	"payer_name" text,
	"provider" text NOT NULL,
	"provider_reference" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_providerReference_unique" UNIQUE("provider_reference")
);
--> statement-breakpoint
CREATE TABLE "rent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"amount" integer NOT NULL,
	"paid_on" date,
	"method" text,
	"receipt_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_listing_id" uuid,
	"target_user_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"infraction" "infraction",
	"decision_note" text,
	"moderator_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_request_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sanctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid,
	"report_id" uuid,
	"infraction" "infraction" NOT NULL,
	"kind" "sanction_kind" NOT NULL,
	"ends_at" timestamp with time zone,
	"authorities_on_request" boolean DEFAULT false NOT NULL,
	"note" text,
	"decided_by_id" uuid,
	"lifted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "success_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"visit_request_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"payer_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"monthly_rent" integer NOT NULL,
	"fee_bps" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" "success_fee_status" DEFAULT 'pending' NOT NULL,
	"payment_id" uuid,
	"paid_at" timestamp with time zone,
	"blocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "success_fees_visitRequestId_unique" UNIQUE("visit_request_id")
);
--> statement-breakpoint
CREATE TABLE "tenancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"tenant_id" uuid,
	"visit_request_id" uuid,
	"monthly_rent" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "tenancy_status" DEFAULT 'pending_fee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"full_name" text,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"staff_role" "staff_role",
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"suspended_until" timestamp with time zone,
	"kyc_status" "kyc_status" DEFAULT 'none' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_photo_key" text,
	"preferred_city_id" uuid,
	"budget_max" integer,
	"preferred_district_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by_id" uuid,
	"bonus_days_credit" integer DEFAULT 0 NOT NULL,
	"ambassador_id" uuid,
	"charter_version" text,
	"charter_accepted_at" timestamp with time zone,
	"privacy_accepted_at" timestamp with time zone,
	"totp_secret" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_referralCode_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "utility_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenancy_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"period_month" date NOT NULL,
	"total_amount" integer NOT NULL,
	"tenant_share" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"seeker_id" uuid NOT NULL,
	"landlord_id" uuid NOT NULL,
	"pack_id" uuid,
	"proposed_slot" timestamp with time zone NOT NULL,
	"slot" timestamp with time zone,
	"message" text,
	"status" "visit_status" DEFAULT 'pending' NOT NULL,
	"highlight" text DEFAULT 'none' NOT NULL,
	"refusal_reason" text,
	"responded_at" timestamp with time zone,
	"validated_at" timestamp with time zone,
	"outcome" "visit_outcome",
	"outcome_at" timestamp with time zone,
	"review_request_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "waitlist_role" NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" boolean DEFAULT true NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"budget_max" integer,
	"ambassador_code" text,
	"survey" jsonb,
	"source" text,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_rewards" ADD CONSTRAINT "ambassador_rewards_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassador_rewards" ADD CONSTRAINT "ambassador_rewards_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banned_identities" ADD CONSTRAINT "banned_identities_sanction_id_sanctions_id_fk" FOREIGN KEY ("sanction_id") REFERENCES "public"."sanctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_visit_request_id_visit_requests_id_fk" FOREIGN KEY ("visit_request_id") REFERENCES "public"."visit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seeker_id_users_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district_reviews" ADD CONSTRAINT "district_reviews_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district_reviews" ADD CONSTRAINT "district_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_proofs" ADD CONSTRAINT "ownership_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_proofs" ADD CONSTRAINT "ownership_proofs_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_records" ADD CONSTRAINT "rent_records_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_listing_id_listings_id_fk" FOREIGN KEY ("target_listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_visit_request_id_visit_requests_id_fk" FOREIGN KEY ("visit_request_id") REFERENCES "public"."visit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_fees" ADD CONSTRAINT "success_fees_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_fees" ADD CONSTRAINT "success_fees_visit_request_id_visit_requests_id_fk" FOREIGN KEY ("visit_request_id") REFERENCES "public"."visit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_fees" ADD CONSTRAINT "success_fees_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_fees" ADD CONSTRAINT "success_fees_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_fees" ADD CONSTRAINT "success_fees_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "success_fees" ADD CONSTRAINT "success_fees_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_visit_request_id_visit_requests_id_fk" FOREIGN KEY ("visit_request_id") REFERENCES "public"."visit_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_city_id_cities_id_fk" FOREIGN KEY ("preferred_city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ambassador_id_ambassadors_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."ambassadors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_tenancy_id_tenancies_id_fk" FOREIGN KEY ("tenancy_id") REFERENCES "public"."tenancies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_seeker_id_users_id_fk" FOREIGN KEY ("seeker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_city_id_active_index" ON "alerts" USING btree ("city_id","active");--> statement-breakpoint
CREATE INDEX "ambassador_rewards_ambassador_id_index" ON "ambassador_rewards" USING btree ("ambassador_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_index" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_index" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "banned_identities_kind_value_hash_index" ON "banned_identities" USING btree ("kind","value_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_country_code_code_index" ON "cities" USING btree ("country_code","code");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_id_device_id_index" ON "devices" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "district_reviews_district_id_author_id_index" ON "district_reviews" USING btree ("district_id","author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "districts_city_id_slug_index" ON "districts" USING btree ("city_id","slug");--> statement-breakpoint
CREATE INDEX "fraud_signals_status_created_at_index" ON "fraud_signals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "fraud_signals_user_id_index" ON "fraud_signals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kyc_verifications_status_created_at_index" ON "kyc_verifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "kyc_verifications_user_id_index" ON "kyc_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listing_media_listing_id_position_index" ON "listing_media" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "listings_status_city_id_published_at_index" ON "listings" USING btree ("status","city_id","published_at");--> statement-breakpoint
CREATE INDEX "listings_publisher_id_index" ON "listings" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "listings_district_id_index" ON "listings" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "listings_approx_location_index" ON "listings" USING gist ("approx_location");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_index" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_codes_phone_created_at_index" ON "otp_codes" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "ownership_proofs_status_created_at_index" ON "ownership_proofs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ownership_proofs_user_id_index" ON "ownership_proofs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "packs_user_id_ends_at_index" ON "packs" USING btree ("user_id","ends_at");--> statement-breakpoint
CREATE INDEX "payments_user_id_created_at_index" ON "payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_index" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_status_created_at_index" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_target_user_id_index" ON "reports" USING btree ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_visit_request_id_author_id_index" ON "reviews" USING btree ("visit_request_id","author_id");--> statement-breakpoint
CREATE INDEX "reviews_subject_id_index" ON "reviews" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "sanctions_user_id_infraction_index" ON "sanctions" USING btree ("user_id","infraction");--> statement-breakpoint
CREATE INDEX "success_fees_payer_id_status_index" ON "success_fees" USING btree ("payer_id","status");--> statement-breakpoint
CREATE INDEX "success_fees_status_due_at_index" ON "success_fees" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "tenancies_landlord_id_index" ON "tenancies" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX "tenancies_tenant_id_index" ON "tenancies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_status_index" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_kyc_status_index" ON "users" USING btree ("kyc_status");--> statement-breakpoint
CREATE INDEX "visit_requests_seeker_id_status_index" ON "visit_requests" USING btree ("seeker_id","status");--> statement-breakpoint
CREATE INDEX "visit_requests_listing_id_status_index" ON "visit_requests" USING btree ("listing_id","status");--> statement-breakpoint
CREATE INDEX "visit_requests_landlord_id_status_index" ON "visit_requests" USING btree ("landlord_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_phone_role_index" ON "waitlist_entries" USING btree ("phone","role");--> statement-breakpoint
CREATE INDEX "waitlist_entries_created_at_index" ON "waitlist_entries" USING btree ("created_at");