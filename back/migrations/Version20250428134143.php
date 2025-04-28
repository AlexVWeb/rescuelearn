<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250428134143 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE learning_card ADD referenciel_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE learning_card ADD CONSTRAINT FK_5044D44B22241379 FOREIGN KEY (referenciel_id) REFERENCES referenciel (id)');
        $this->addSql('CREATE INDEX IDX_5044D44B22241379 ON learning_card (referenciel_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE learning_card DROP FOREIGN KEY FK_5044D44B22241379');
        $this->addSql('DROP INDEX IDX_5044D44B22241379 ON learning_card');
        $this->addSql('ALTER TABLE learning_card DROP referenciel_id');
    }
}
