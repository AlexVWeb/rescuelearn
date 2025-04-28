<?php

namespace App\Entity;

use App\Repository\ReferencielRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ReferencielRepository::class)]
#[ORM\Table(name: 'referenciel')]
class Referenciel
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private $id;

    #[ORM\Column(type: 'string', length: 255)]
    private $title;

    #[ORM\Column(type: 'string', length: 255)]
    private $pdfUrl;

    #[Assert\File(
        maxSize: '5M',
        mimeTypes: ['application/pdf'],
        mimeTypesMessage: 'Veuillez uploader un fichier PDF valide'
    )]
    private ?File $pdfFile = null;

    #[ORM\Column(type: 'integer')]
    private $year_edition;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function getPdfUrl(): ?string
    {
        return $this->pdfUrl;
    }
    
    public function getYearEdition(): ?int
    {
        return $this->year_edition;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;

        return $this;
    }
    
    public function setPdfUrl(string $pdfUrl): self
    {
        $this->pdfUrl = $pdfUrl;

        return $this;
    }
    
    public function setYearEdition(int $yearEdition): self
    {
        $this->year_edition = $yearEdition;

        return $this;
    }

    public function getPdfFile(): ?File
    {
        return $this->pdfFile;
    }

    public function setPdfFile(?File $pdfFile = null): void
    {
        $this->pdfFile = $pdfFile;
    }

    public function __toString(): string
    {
        return $this->title;
    }
}