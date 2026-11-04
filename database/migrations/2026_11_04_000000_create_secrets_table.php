<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Datenmodell laut docs/SPEC.md. Kein Klartext-Feld, keine IP-Spalte (ein Test prüft das).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('secrets', function (Blueprint $table) {
            $table->string('id', 22)->primary();
            $table->unsignedTinyInteger('v');
            $table->string('kdf_name', 16);
            $table->unsignedInteger('kdf_m');
            $table->unsignedTinyInteger('kdf_t');
            $table->unsignedTinyInteger('kdf_p');
            $table->string('salt', 22);
            $table->string('iv', 16);
            $table->text('ciphertext')->nullable();
            $table->string('verifier', 43);
            $table->string('manage_hash', 43);
            $table->unsignedTinyInteger('max_views');
            $table->unsignedTinyInteger('views_used')->default(0);
            $table->unsignedTinyInteger('max_attempts');
            $table->unsignedTinyInteger('failed_attempts')->default(0);
            $table->dateTime('expires_at')->index();
            $table->dateTime('destroyed_at')->nullable()->index();
            $table->string('destroyed_reason', 16)->nullable();
            $table->dateTime('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('secrets');
    }
};
