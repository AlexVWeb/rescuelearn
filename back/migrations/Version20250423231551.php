<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250423231551 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE snvscenario (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, level VARCHAR(50) NOT NULL, description LONGTEXT NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE snvvictim (id INT AUTO_INCREMENT NOT NULL, scenario_id INT NOT NULL, description LONGTEXT NOT NULL, correct_answer INT NOT NULL, explanation LONGTEXT NOT NULL, INDEX IDX_D1F012ACE04E49DF (scenario_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE snvvictim ADD CONSTRAINT FK_D1F012ACE04E49DF FOREIGN KEY (scenario_id) REFERENCES snvscenario (id)');
        $this->addSql('ALTER TABLE user RENAME INDEX uniq_identifier_email TO UNIQ_8D93D649E7927C74');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE snvvictim DROP FOREIGN KEY FK_D1F012ACE04E49DF');
        $this->addSql('DROP TABLE snvscenario');
        $this->addSql('DROP TABLE snvvictim');
        $this->addSql('ALTER TABLE user RENAME INDEX uniq_8d93d649e7927c74 TO UNIQ_IDENTIFIER_EMAIL');
    }
}
